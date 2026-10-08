import type { Connect, ViteDevServer } from 'vite';
import http from 'http';
import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';

interface CheckRequestBody {
  userId?: string;
  userEmail?: string;
  notifyEmail?: boolean;
  scope?: 'all' | 'custom';
  customGameIds?: string[];
  maxPrice?: number;
  games?: Array<{
    id: string;
    title: string;
    steamAppId?: number;
    coverImage?: string;
    currentPrice?: number;
  }>;
}

interface SendAlertEmailOptions {
  to: string;
  gameTitle: string;
  currentPrice: number;
  regularPrice?: number;
  maxPrice: number;
  storeName: string;
  buyUrl: string;
  coverImage?: string;
  currency?: string;
  steamAppId?: number;
}

interface EmailConfig {
  provider: 'auto' | 'gmail' | 'resend' | 'brevo' | 'apps_script' | 'smtp';
  gmailUser?: string;
  gmailAppPass?: string;
  resendApiKey?: string;
  brevoApiKey?: string;
  appsScriptUrl?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  smtpSecure?: boolean;
  smtpFrom?: string;
}

// In-memory cache for IsThereAnyDeal lookups and rate limits
const itadLookupCache = new Map<string, string>(); // title/appid -> itadGameId
const lastAlertSignatures = new Set<string>(); // avoid spamming duplicate notifications
let etherealAccount: any = null;

const CONFIG_FILE_PATH = path.resolve(process.cwd(), 'alert_email_config.json');

function loadEmailConfig(env: Record<string, string>): EmailConfig {
  let fileConfig: Partial<EmailConfig> = {};
  try {
    if (fs.existsSync(CONFIG_FILE_PATH)) {
      const content = fs.readFileSync(CONFIG_FILE_PATH, 'utf-8');
      fileConfig = JSON.parse(content);
    }
  } catch (err) {
    console.warn('[Email Config] Error reading config file:', err);
  }

  return {
    provider: fileConfig.provider || 'auto',
    gmailUser: fileConfig.gmailUser || process.env.GMAIL_USER || env.GMAIL_USER || '',
    gmailAppPass: fileConfig.gmailAppPass || process.env.GMAIL_APP_PASS || env.GMAIL_APP_PASS || '',
    resendApiKey: fileConfig.resendApiKey || process.env.RESEND_API_KEY || env.RESEND_API_KEY || '',
    brevoApiKey: fileConfig.brevoApiKey || process.env.BREVO_API_KEY || env.BREVO_API_KEY || '',
    appsScriptUrl: fileConfig.appsScriptUrl || process.env.GOOGLE_APPS_SCRIPT_URL || env.GOOGLE_APPS_SCRIPT_URL || process.env.VITE_GOOGLE_OTP_SCRIPT_URL || env.VITE_GOOGLE_OTP_SCRIPT_URL || '',
    smtpHost: fileConfig.smtpHost || process.env.SMTP_HOST || env.SMTP_HOST || '',
    smtpPort: fileConfig.smtpPort || Number(process.env.SMTP_PORT || env.SMTP_PORT || 587),
    smtpUser: fileConfig.smtpUser || process.env.SMTP_USER || env.SMTP_USER || '',
    smtpPass: fileConfig.smtpPass || process.env.SMTP_PASS || env.SMTP_PASS || '',
    smtpSecure: fileConfig.smtpSecure ?? ((process.env.SMTP_SECURE || env.SMTP_SECURE) === 'true'),
    smtpFrom: fileConfig.smtpFrom || process.env.SMTP_FROM || env.SMTP_FROM || 'OffertGames <avisos@offertgames.com>'
  };
}

function saveEmailConfigFile(config: EmailConfig) {
  try {
    fs.writeFileSync(CONFIG_FILE_PATH, JSON.stringify(config, null, 2), 'utf-8');
  } catch (err) {
    console.error('[Email Config] Failed to save config file:', err);
  }
}

function parseJsonBody<T>(req: http.IncomingMessage): Promise<T> {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', chunk => {
      data += chunk;
      if (data.length > 5 * 1024 * 1024) {
        req.destroy();
        reject(new Error('Request payload too large'));
      }
    });
    req.on('end', () => {
      try {
        resolve(data ? JSON.parse(data) : ({} as T));
      } catch (err) {
        resolve({} as T);
      }
    });
    req.on('error', reject);
  });
}

function sendJson(res: http.ServerResponse, statusCode: number, payload: unknown) {
  res.statusCode = statusCode;
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Bypass-Tunnel-Reminder');
  res.end(JSON.stringify(payload));
}

/**
 * Builds the visual HTML email matching the exact OffertGames dark-mode gaming aesthetics
 */
export function buildVisualEmailHtml(options: SendAlertEmailOptions): string {
  const {
    to,
    gameTitle,
    currentPrice,
    regularPrice,
    maxPrice,
    storeName,
    buyUrl,
    coverImage = '',
    steamAppId
  } = options;

  const formattedCurrent = currentPrice.toFixed(2);
  const formattedRegular = regularPrice ? regularPrice.toFixed(2) : null;
  const formattedMax = maxPrice.toFixed(2);
  const discountPercent = regularPrice && regularPrice > currentPrice
    ? Math.round(((regularPrice - currentPrice) / regularPrice) * 100)
    : null;

  // Ensure game official cover/capsule from Steam CDN if steamAppId is available
  let finalCover = coverImage;
  if (!finalCover || finalCover.includes('unsplash') || finalCover.trim() === '') {
    if (steamAppId) {
      finalCover = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${steamAppId}/capsule_616x353.jpg`;
    } else {
      finalCover = 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1245620/capsule_616x353.jpg';
    }
  }

  // Clean store name
  const cleanStoreName = (storeName || 'Steam').replace(/\s*\(España\)/i, '').trim();

  // Ensure exact store link for the selected game
  let finalBuyUrl = buyUrl;
  if (!finalBuyUrl || finalBuyUrl.includes('search') || finalBuyUrl === 'https://store.steampowered.com/') {
    if (steamAppId) {
      finalBuyUrl = `https://store.steampowered.com/app/${steamAppId}/`;
    } else {
      finalBuyUrl = `https://store.steampowered.com/search/?term=${encodeURIComponent(gameTitle)}`;
    }
  }

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>¡Bajada de precio en OffertGames!</title>
  <style>
    body { margin: 0; padding: 0; background-color: #0b1017; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #f1f5f9; -webkit-text-size-adjust: 100%; }
    table { border-collapse: separate; border-spacing: 0; width: 100%; }
    .wrapper { width: 100%; max-width: 560px; margin: 0 auto; background-color: #121a24; border: 1px solid #233145; border-radius: 16px; overflow: hidden; box-shadow: 0 16px 36px rgba(0,0,0,0.5); }
    .header { background: linear-gradient(180deg, #182230 0%, #121a24 100%); padding: 22px 18px; text-align: center; border-bottom: 1px solid #233145; }
    .logo-text { font-size: 24px; font-weight: 900; color: #f59e0b; text-decoration: none; letter-spacing: -0.5px; }
    .logo-cyan { color: #38bdf8; }
    .header-sub { margin: 4px 0 0 0; color: #94a3b8; font-size: 11px; font-weight: 500; }
    .content { padding: 24px 18px; }
    .badge { display: inline-block; background-color: rgba(56, 189, 248, 0.12); color: #38bdf8; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 9999px; border: 1px solid rgba(56, 189, 248, 0.35); text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 14px; }
    .title { font-size: 20px; font-weight: 800; color: #ffffff; margin: 0 0 10px 0; line-height: 1.3; }
    .desc { color: #94a3b8; font-size: 13px; line-height: 1.5; margin: 0 0 20px 0; }
    .card-box { background-color: #16202c; border: 1px solid #28394e; border-radius: 14px; overflow: hidden; margin-bottom: 22px; }
    .cover-img { width: 100%; max-width: 524px; height: auto; max-height: 260px; object-fit: cover; display: block; }
    .card-body { padding: 18px 16px; }
    .store-tag { display: inline-block; background-color: #212e3e; color: #38bdf8; font-size: 11px; font-weight: 700; padding: 3px 8px; border-radius: 6px; margin-bottom: 8px; }
    .game-name { font-size: 18px; font-weight: 800; color: #ffffff; line-height: 1.3; margin-bottom: 10px; }
    .price-row { margin-top: 4px; }
    .price-now { font-size: 28px; font-weight: 900; color: #10b981; line-height: 1; }
    .price-old { font-size: 15px; color: #64748b; text-decoration: line-through; margin-left: 8px; font-weight: 600; }
    .discount-pill { display: inline-block; background-color: #ef4444; color: #ffffff; font-size: 12px; font-weight: 800; padding: 2px 7px; border-radius: 5px; margin-left: 8px; }
    .threshold-box { background-color: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25); color: #34d399; font-size: 12px; font-weight: 700; padding: 8px 12px; border-radius: 8px; margin-top: 14px; }
    .footer { background-color: #0c121a; padding: 20px 16px; text-align: center; border-top: 1px solid #1e293b; font-size: 11px; color: #64748b; line-height: 1.5; }
    .footer a { color: #38bdf8; text-decoration: none; }
  </style>
</head>
<body>
  <table role="presentation" width="100%" bgcolor="#0b1017" style="padding: 16px 8px;">
    <tr>
      <td align="center">
        <div class="wrapper">
          <div class="header">
            <div class="logo-text">Offert<span class="logo-cyan">Games</span></div>
            <div class="header-sub">Tu comparador inteligente de precios de videojuegos en España</div>
          </div>
          <div class="content">
            <div class="badge">🎯 PRECIO POR DEBAJO DE TU LÍMITE</div>
            <h1 class="title">¡${gameTitle} ha bajado de precio!</h1>
            <p class="desc">
              Buenas noticias. El juego que estabas siguiendo ha alcanzado o bajado de tu precio máximo deseado de <strong>${formattedMax} €</strong>.
            </p>

            <div class="card-box" style="background-color: #16202c; border: 1px solid #28394e; border-radius: 14px; overflow: hidden; margin-bottom: 22px;">
              <img src="${finalCover}" alt="${gameTitle}" class="cover-img" style="width: 100%; max-width: 100%; height: auto; display: block; border-top-left-radius: 14px; border-top-right-radius: 14px;" />
              <div class="card-body" style="padding: 18px 16px;">
                <div class="store-tag" style="display: inline-block; background-color: #212e3e; color: #38bdf8; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; margin-bottom: 8px;">🎮 Tienda Oficial: ${cleanStoreName} (España)</div>
                <div class="game-name" style="font-size: 18px; font-weight: 800; color: #ffffff; line-height: 1.3; margin-bottom: 10px;">${gameTitle}</div>
                <div class="price-row" style="margin-top: 4px;">
                  <span class="price-now" style="font-size: 28px; font-weight: 900; color: #10b981; line-height: 1;">${formattedCurrent} €</span>
                  ${formattedRegular ? `<span class="price-old" style="font-size: 15px; color: #64748b; text-decoration: line-through; margin-left: 8px; font-weight: 600;">${formattedRegular} €</span>` : ''}
                  ${discountPercent ? `<span class="discount-pill" style="display: inline-block; background-color: #ef4444; color: #ffffff; font-size: 12px; font-weight: 800; padding: 2px 7px; border-radius: 5px; margin-left: 8px;">-${discountPercent}%</span>` : ''}
                </div>
                <div class="threshold-box" style="background-color: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25); color: #34d399; font-size: 12px; font-weight: 700; padding: 8px 12px; border-radius: 8px; margin-top: 14px;">
                  ✓ Tu límite configurado: ${formattedMax} €
                </div>
              </div>
            </div>

            <!-- Bulletproof Responsive Mobile Button: Never cut off on any phone -->
            <table role="presentation" border="0" cellpadding="0" cellspacing="0" width="100%" style="margin: 22px auto 0 auto; max-width: 360px;">
              <tr>
                <td align="center" bgcolor="#f59e0b" style="border-radius: 12px; background-color: #f59e0b; background-image: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 14px 16px; text-align: center;">
                  <a href="${finalBuyUrl}" target="_blank" style="display: inline-block; width: 100%; color: #000000 !important; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 15px; font-weight: 900; text-align: center; text-decoration: none; text-transform: uppercase; letter-spacing: 0.5px; line-height: 1.3; word-break: break-word;">
                    🔥 Ver oferta en ${cleanStoreName} →
                  </a>
                </td>
              </tr>
            </table>
          </div>
          <div class="footer">
            Has recibido este aviso en <strong>${to}</strong> porque estás registrado en OffertGames.<br>
            Precios reales comprobados en euros (€) para España.<br>
            <a href="http://localhost:5000">Ir a OffertGames</a> · <a href="http://localhost:5000">Configurar avisos</a>
          </div>
        </div>
      </td>
    </tr>
  </table>
</body>
</html>
`;
}

/**
 * Universal multi-channel free email dispatcher:
 * Supports:
 * 1. Resend API (Free forever, 3000/mo, 100/day)
 * 2. Brevo API (Free forever, 9000/mo, 300/day)
 * 3. Gmail Direct SMTP with App Password (Free forever, 500/day)
 * 4. Google Apps Script Web App (Free forever, 100/day)
 * 5. Custom SMTP (Host/Port/User/Pass)
 * 6. Ethereal Email Instant Fallback (Free forever, creates live real email and preview URL)
 */
async function sendPriceAlertEmail(
  options: SendAlertEmailOptions,
  env: Record<string, string>
): Promise<{
  success: boolean;
  provider: string;
  previewUrl?: string;
  messageId?: string;
  error?: string;
}> {
  const config = loadEmailConfig(env);
  const { to, gameTitle, currentPrice, maxPrice, storeName } = options;
  const formattedCurrent = currentPrice.toFixed(2);
  const formattedMax = maxPrice.toFixed(2);
  const cleanStore = (storeName || 'Steam').replace(/\s*\(España\)/i, '').trim();
  const subject = `Aviso de precio: ${gameTitle} ha bajado a ${formattedCurrent} € - OffertGames`;
  const textContent = `OffertGames - Aviso de bajada de precio\n\nEl juego "${gameTitle}" ha alcanzado o bajado de tu límite deseado.\nPrecio actual: ${formattedCurrent} € (tu límite era ${formattedMax} €)\nTienda oficial: ${cleanStore} (España)\n\nVer oferta y comprar:\n${options.buyUrl}\n\nHas recibido este aviso en ${to} porque eres un usuario registrado en OffertGames.`;
  const htmlContent = buildVisualEmailHtml(options);

  // Channel 1: Resend API (100% Free Forever)
  if (config.resendApiKey && config.resendApiKey.startsWith('re_')) {
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${config.resendApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: 'OffertGames <onboarding@resend.dev>',
          to: [to],
          subject,
          text: textContent,
          html: htmlContent
        })
      });

      const resData = await res.json();
      if (res.ok && resData.id) {
        console.log(`[ALERT EMAIL] Sent via Resend API to ${to}: id ${resData.id}`);
        return { success: true, provider: 'resend', messageId: resData.id };
      } else {
        console.warn('[ALERT EMAIL] Resend error:', resData);
      }
    } catch (err: any) {
      console.error('[ALERT EMAIL] Resend fetch exception:', err);
    }
  }

  // Channel 2: Brevo API (100% Free Forever)
  if (config.brevoApiKey) {
    try {
      const res = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': config.brevoApiKey,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          sender: { name: 'OffertGames', email: 'avisos@offertgames.com' },
          to: [{ email: to }],
          subject,
          textContent,
          htmlContent
        })
      });

      const resData = await res.json();
      if (res.ok && resData.messageId) {
        console.log(`[ALERT EMAIL] Sent via Brevo API to ${to}: messageId ${resData.messageId}`);
        return { success: true, provider: 'brevo', messageId: resData.messageId };
      } else {
        console.warn('[ALERT EMAIL] Brevo error:', resData);
      }
    } catch (err: any) {
      console.error('[ALERT EMAIL] Brevo fetch exception:', err);
    }
  }

  // Channel 3: Google Apps Script Web App (100% Free Forever)
  if (config.appsScriptUrl && config.appsScriptUrl.includes('script.google.com')) {
    try {
      const res = await fetch(config.appsScriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to,
          subject,
          html: htmlContent
        })
      });

      if (res.ok) {
        console.log(`[ALERT EMAIL] Sent via Google Apps Script to ${to}`);
        return { success: true, provider: 'apps_script' };
      }
    } catch (err: any) {
      console.error('[ALERT EMAIL] Google Apps Script exception:', err);
    }
  }

  // Channel 4: Gmail SMTP with App Password (100% Free Forever) - Direct SSL 465
  if (config.gmailUser && config.gmailAppPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        family: 4,
        auth: {
          user: config.gmailUser,
          pass: config.gmailAppPass.replace(/\s+/g, '')
        }
      } as any);

      const info = await transporter.sendMail({
        from: `"OffertGames" <${config.gmailUser}>`,
        to,
        replyTo: config.gmailUser,
        subject,
        text: textContent,
        html: htmlContent
      });

      console.log(`[ALERT EMAIL] Sent via Gmail SMTP to ${to}: id ${info.messageId}`);
      return { success: true, provider: 'gmail_smtp', messageId: info.messageId };
    } catch (err: any) {
      console.error('[ALERT EMAIL] Gmail SMTP error:', err);
    }
  }

  // Channel 5: Custom SMTP (if host/user/pass provided)
  if (config.smtpHost && config.smtpUser && config.smtpPass) {
    try {
      const transporter = nodemailer.createTransport({
        host: config.smtpHost,
        port: config.smtpPort,
        secure: config.smtpSecure,
        family: 4,
        auth: {
          user: config.smtpUser,
          pass: config.smtpPass
        }
      } as any);

      const info = await transporter.sendMail({
        from: config.smtpFrom || 'OffertGames <avisos@offertgames.com>',
        to,
        subject,
        html: htmlContent
      });

      console.log(`[ALERT EMAIL] Sent via Custom SMTP to ${to}: id ${info.messageId}`);
      return { success: true, provider: 'custom_smtp', messageId: info.messageId };
    } catch (err: any) {
      console.error('[ALERT EMAIL] Custom SMTP error:', err);
    }
  }

  // Channel 6: Automatic Ethereal Email Real Fallback (100% Free Forever, 0 Config, Real Live Email)
  try {
    if (!etherealAccount) {
      etherealAccount = await nodemailer.createTestAccount();
      console.log('[ALERT EMAIL] Created live Ethereal inbox account:', etherealAccount.user);
    }

    const transporter = nodemailer.createTransport({
      host: etherealAccount.smtp.host,
      port: etherealAccount.smtp.port,
      secure: etherealAccount.smtp.secure,
      auth: {
        user: etherealAccount.user,
        pass: etherealAccount.pass
      }
    });

    const info = await transporter.sendMail({
      from: 'OffertGames <avisos@offertgames.com>',
      to,
      subject,
      html: htmlContent
    });

    const previewUrl = nodemailer.getTestMessageUrl(info) || undefined;
    console.log(`[ALERT EMAIL] Sent via Ethereal to ${to}. Preview URL: ${previewUrl}`);

    return {
      success: true,
      provider: 'ethereal',
      previewUrl,
      messageId: info.messageId
    };
  } catch (err: any) {
    console.error('[ALERT EMAIL] Ethereal fallback error:', err);
    return {
      success: false,
      provider: 'none',
      error: err?.message || 'Error al enviar correo'
    };
  }
}

/**
 * Official IsThereAnyDeal API v2 Server-side queries
 * Documentation: https://docs.isthereanydeal.com/
 */
async function queryItadDeal(itadApiKey: string, gameTitle: string, steamAppId?: number) {
  if (!itadApiKey) return null;

  try {
    const cacheKey = steamAppId ? `steam:${steamAppId}` : `title:${gameTitle.toLowerCase().trim()}`;
    let itadId = itadLookupCache.get(cacheKey);

    // Step 1: /games/lookup/v1 (Lookup game based on title or Steam appid)
    if (!itadId) {
      let lookupUrl = `https://api.isthereanydeal.com/games/lookup/v1?key=${encodeURIComponent(itadApiKey)}`;
      if (steamAppId) {
        lookupUrl += `&appid=${steamAppId}`;
      } else {
        lookupUrl += `&title=${encodeURIComponent(gameTitle)}`;
      }

      const lookupRes = await fetch(lookupUrl);
      if (!lookupRes.ok) return null;
      const lookupData = await lookupRes.json();
      if (!lookupData.found || !lookupData.game?.id) return null;

      itadId = lookupData.game.id;
      itadLookupCache.set(cacheKey, itadId!);
    }

    // Step 2: /games/overview/v2 (Get Spain EUR prices and deals)
    // Parameter country=ES ensures prices in Spain and EUR currency
    const overviewUrl = `https://api.isthereanydeal.com/games/overview/v2?key=${encodeURIComponent(itadApiKey)}&country=ES`;
    const overviewRes = await fetch(overviewUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify([itadId])
    });

    if (!overviewRes.ok) return null;
    const overviewData = await overviewRes.json();
    const gamePrice = overviewData.prices?.find((p: any) => p.id === itadId);
    if (!gamePrice || !gamePrice.current) return null;

    const current = gamePrice.current;
    return {
      source: 'isthereanydeal' as const,
      storeName: current.shop?.name || 'Tienda oficial',
      currentPrice: Number(current.price?.amount || 0),
      regularPrice: Number(current.regular?.amount || 0),
      currency: current.price?.currency || 'EUR',
      cut: Number(current.cut || 0),
      buyUrl: current.url || `https://isthereanydeal.com/`
    };
  } catch (err) {
    console.error('[ITAD Server] Error querying IsThereAnyDeal:', err);
    return null;
  }
}

/**
 * Direct real-time Steam Spain API fallback when ITAD key is not yet provided
 * Official Steam API returns 100% verified real EUR prices for Spain
 */
async function querySteamDirectDeal(steamAppId: number) {
  try {
    const url = `https://store.steampowered.com/api/appdetails?appids=${steamAppId}&cc=es&filters=price_overview`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const appDetails = data[steamAppId];
    if (!appDetails?.success || !appDetails.data?.price_overview) return null;

    const po = appDetails.data.price_overview;
    return {
      source: 'steam_direct' as const,
      storeName: 'Steam',
      currentPrice: po.final / 100,
      regularPrice: po.initial / 100,
      currency: po.currency || 'EUR',
      cut: po.discount_percent || 0,
      buyUrl: `https://store.steampowered.com/app/${steamAppId}/`
    };
  } catch (err) {
    console.error('[Steam Server] Error querying Steam Store:', err);
    return null;
  }
}

export function alertServerMiddleware(server: ViteDevServer, env: Record<string, string>) {
  // ITAD API Key is stored safely on the server and never exposed to the frontend bundle
  const itadApiKey = (process.env.ITAD_API_KEY || env.ITAD_API_KEY || '').trim();

  server.middlewares.use(async (req: Connect.IncomingMessage, res: http.ServerResponse, next: Connect.NextFunction) => {
    const url = req.url || '';

    // CORS preflight & handler for /api/nvidia
    if (url.startsWith('/api/nvidia')) {
      if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
        res.end();
        return;
      }

      if (req.method === 'POST') {
        try {
          const body = await parseJsonBody(req);
          const apiKey = (process.env.VITE_NVIDIA_API_KEY || env.VITE_NVIDIA_API_KEY || '').trim();
          
          const nvidiaRes = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${apiKey}`
            },
            body: JSON.stringify(body)
          });

          const data = await nvidiaRes.json();
          sendJson(res, nvidiaRes.status, data);
          return;
        } catch (err: any) {
          sendJson(res, 500, { ok: false, error: err?.message || 'Error en proxy NVIDIA' });
          return;
        }
      }
    }

    // CORS preflight
    if (req.method === 'OPTIONS' && url.startsWith('/api/alerts')) {
      res.statusCode = 204;
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, Bypass-Tunnel-Reminder');
      res.end();
      return;
    }

    // 1. GET /api/alerts/status - Server health & API key configuration status
    if (req.method === 'GET' && url.startsWith('/api/alerts/status')) {
      const cfg = loadEmailConfig(env);
      let activeProvider = 'Ethereal (Visor Inmediato 100% Gratis)';
      let isRealInbox = false;

      if (cfg.resendApiKey) {
        activeProvider = 'Resend API (Gratis para siempre)';
        isRealInbox = true;
      } else if (cfg.brevoApiKey) {
        activeProvider = 'Brevo API (Gratis para siempre)';
        isRealInbox = true;
      } else if (cfg.gmailUser && cfg.gmailAppPass) {
        activeProvider = `Gmail (${cfg.gmailUser} - Gratis para siempre)`;
        isRealInbox = true;
      } else if (cfg.appsScriptUrl) {
        activeProvider = 'Google Apps Script (Gratis para siempre)';
        isRealInbox = true;
      } else if (cfg.smtpHost) {
        activeProvider = `SMTP (${cfg.smtpHost})`;
        isRealInbox = true;
      }

      sendJson(res, 200, {
        ok: true,
        itadConfigured: Boolean(itadApiKey),
        itadKeyMasked: itadApiKey ? `${itadApiKey.slice(0, 4)}...${itadApiKey.slice(-4)}` : null,
        country: 'ES',
        currency: 'EUR',
        activePriceProvider: itadApiKey ? 'IsThereAnyDeal (Oficial)' : 'Steam España (Directo)',
        emailConfigured: true, // Always ready via Ethereal or configured provider
        emailProvider: activeProvider,
        isRealInbox,
        config: {
          hasGmail: Boolean(cfg.gmailUser && cfg.gmailAppPass),
          hasResend: Boolean(cfg.resendApiKey),
          hasBrevo: Boolean(cfg.brevoApiKey),
          hasAppsScript: Boolean(cfg.appsScriptUrl),
          hasCustomSmtp: Boolean(cfg.smtpHost)
        }
      });
      return;
    }

    // 2. POST /api/alerts/config - Save email credentials 100% free
    if (req.method === 'POST' && url.startsWith('/api/alerts/config')) {
      try {
        const body = await parseJsonBody<Partial<EmailConfig>>(req);
        const current = loadEmailConfig(env);
        const merged: EmailConfig = {
          ...current,
          ...body
        };
        saveEmailConfigFile(merged);

        sendJson(res, 200, {
          ok: true,
          message: 'Configuración de correo guardada con éxito.'
        });
        return;
      } catch (err: any) {
        sendJson(res, 500, { ok: false, error: err?.message || 'Error al guardar configuración' });
        return;
      }
    }

    // 3. POST /api/alerts/check - Server-side price drop evaluation
    if (req.method === 'POST' && url.startsWith('/api/alerts/check')) {
      try {
        const body = await parseJsonBody<CheckRequestBody>(req);
        const {
          userId = 'guest',
          userEmail = '',
          notifyEmail = false,
          scope = 'all',
          customGameIds = [],
          maxPrice = 20,
          games = []
        } = body;

        let targetGames = games.filter(g => 
          g.id !== 'game-steam-20900' && 
          !g.title?.toLowerCase().includes('enhanced edition')
        );
        if (scope === 'custom') {
          const idSet = new Set(customGameIds);
          targetGames = targetGames.filter(g => idSet.has(g.id));
        }

        // Limit batch to maximum 25 games per check to respect rate limits
        const gamesToCheck = targetGames.slice(0, 25);
        const alertsFound: Array<any> = [];
        let emailsSent = 0;
        let lastPreviewUrl: string | undefined = undefined;

        for (const game of gamesToCheck) {
          let dealInfo: any = null;

          if (itadApiKey) {
            dealInfo = await queryItadDeal(itadApiKey, game.title, game.steamAppId);
          }

          if (!dealInfo && game.steamAppId) {
            dealInfo = await querySteamDirectDeal(game.steamAppId);
          }

          if (dealInfo && typeof dealInfo.currentPrice === 'number') {
            // Price drop condition: Real price <= maxPrice
            if (dealInfo.currentPrice <= maxPrice) {
              const signature = `${userId}_${game.id}_${dealInfo.storeName}_${Math.round(dealInfo.currentPrice * 100)}`;
              const isDuplicate = lastAlertSignatures.has(signature);

              if (!isDuplicate) {
                lastAlertSignatures.add(signature);
                if (lastAlertSignatures.size > 2000) {
                  const first = lastAlertSignatures.values().next().value;
                  if (first) lastAlertSignatures.delete(first);
                }

                const alertObj = {
                  id: `alert-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                  userId,
                  gameId: game.id,
                  gameTitle: game.title,
                  gameCover: game.coverImage || '',
                  maxPriceTarget: maxPrice,
                  currentPrice: dealInfo.currentPrice,
                  regularPrice: dealInfo.regularPrice,
                  currency: dealInfo.currency || 'EUR',
                  storeName: dealInfo.storeName,
                  buyUrl: dealInfo.buyUrl,
                  dealCut: dealInfo.cut,
                  source: dealInfo.source,
                  message: `${game.title} ha bajado a menos de ${maxPrice} €`,
                  timestamp: new Date().toISOString(),
                  read: false
                };

                alertsFound.push(alertObj);

                // Dispatch Email Notification if requested and user has email
                if (notifyEmail && userEmail && userEmail.includes('@')) {
                  const emailRes = await sendPriceAlertEmail({
                    to: userEmail,
                    gameTitle: game.title,
                    currentPrice: dealInfo.currentPrice,
                    regularPrice: dealInfo.regularPrice,
                    maxPrice,
                    storeName: dealInfo.storeName,
                    buyUrl: dealInfo.buyUrl,
                    coverImage: game.coverImage,
                    steamAppId: game.steamAppId
                  }, env);

                  if (emailRes.success) {
                    emailsSent++;
                    if (emailRes.previewUrl) lastPreviewUrl = emailRes.previewUrl;
                  }
                }
              }
            }
          }
        }

        sendJson(res, 200, {
          ok: true,
          checkedCount: gamesToCheck.length,
          alertsCount: alertsFound.length,
          alerts: alertsFound,
          emailsSent,
          lastPreviewUrl,
          usedSource: itadApiKey ? 'isthereanydeal' : 'steam_direct',
          itadConfigured: Boolean(itadApiKey)
        });
        return;
      } catch (err: any) {
        sendJson(res, 500, { ok: false, error: err?.message || 'Error en comprobación de precios' });
        return;
      }
    }

    // 4. POST /api/alerts/test-single - Single game alert test
    if (req.method === 'POST' && url.startsWith('/api/alerts/test-single')) {
      try {
        const body = await parseJsonBody<{
          userId?: string;
          userEmail?: string;
          notifyEmail?: boolean;
          gameTitle?: string;
          steamAppId?: number;
          maxPrice?: number;
          gameId?: string;
          coverImage?: string;
        }>(req);

        const title = body.gameTitle || 'Elden Ring';
        const appId = body.steamAppId || 1245620;
        const maxPrice = typeof body.maxPrice === 'number' ? body.maxPrice : 20;

        let deal: any = null;
        if (itadApiKey) {
          deal = await queryItadDeal(itadApiKey, title, appId);
        }
        if (!deal && appId) {
          deal = await querySteamDirectDeal(appId);
        }

        if (deal) {
          const alert = {
            id: `alert-test-${Date.now()}`,
            userId: body.userId || 'usuario_actual',
            gameId: body.gameId || 'game-elden-ring',
            gameTitle: title,
            gameCover: body.coverImage || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=600&q=80',
            maxPriceTarget: maxPrice,
            currentPrice: deal.currentPrice,
            regularPrice: deal.regularPrice,
            currency: deal.currency || 'EUR',
            storeName: deal.storeName,
            buyUrl: deal.buyUrl,
            dealCut: deal.cut,
            source: deal.source,
            message: `${title} ha bajado a menos de ${maxPrice} €`,
            timestamp: new Date().toISOString(),
            read: false,
            matchesTarget: deal.currentPrice <= maxPrice
          };

          let emailStatus: any = null;
          if (body.notifyEmail && body.userEmail && body.userEmail.includes('@') && alert.matchesTarget) {
            emailStatus = await sendPriceAlertEmail({
              to: body.userEmail,
              gameTitle: title,
              currentPrice: deal.currentPrice,
              regularPrice: deal.regularPrice,
              maxPrice,
              storeName: deal.storeName,
              buyUrl: deal.buyUrl,
              coverImage: alert.gameCover,
              steamAppId: appId
            }, env);
          }

          sendJson(res, 200, {
            ok: true,
            dealFound: true,
            alert,
            emailStatus,
            source: deal.source,
            itadConfigured: Boolean(itadApiKey)
          });
          return;
        }

        sendJson(res, 200, {
          ok: false,
          dealFound: false,
          message: itadApiKey 
            ? `No se encontró oferta para ${title} en IsThereAnyDeal España.`
            : `Falta configurar ITAD_API_KEY en .env y no se pudo obtener precio directo para Steam AppId ${appId}.`,
          itadConfigured: Boolean(itadApiKey)
        });
        return;
      } catch (err: any) {
        sendJson(res, 500, { ok: false, error: err?.message || 'Error en prueba de juego' });
        return;
      }
    }

    // 5. POST /api/alerts/test-email - Direct test email sending
    if (req.method === 'POST' && url.startsWith('/api/alerts/test-email')) {
      try {
        const body = await parseJsonBody<{
          to: string;
          gameTitle?: string;
          currentPrice?: number;
          regularPrice?: number;
          maxPrice?: number;
          storeName?: string;
          buyUrl?: string;
          coverImage?: string;
          steamAppId?: number;
        }>(req);

        if (!body.to || !body.to.includes('@')) {
          sendJson(res, 400, { ok: false, error: 'Debe proporcionarse una dirección de correo válida.' });
          return;
        }

        const title = body.gameTitle || 'Elden Ring';
        const appId = body.steamAppId || 1245620;
        const buyUrl = body.buyUrl || (appId ? `https://store.steampowered.com/app/${appId}/` : `https://store.steampowered.com/search/?term=${encodeURIComponent(title)}`);
        const coverImage = body.coverImage || (appId ? `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/capsule_616x353.jpg` : '');

        const emailRes = await sendPriceAlertEmail({
          to: body.to,
          gameTitle: title,
          currentPrice: typeof body.currentPrice === 'number' ? body.currentPrice : 19.99,
          regularPrice: typeof body.regularPrice === 'number' ? body.regularPrice : 59.99,
          maxPrice: typeof body.maxPrice === 'number' ? body.maxPrice : 20,
          storeName: body.storeName || 'Steam',
          buyUrl,
          coverImage,
          steamAppId: appId
        }, env);

        if (emailRes.success) {
          const providerText = emailRes.provider === 'ethereal'
            ? 'correo generado en el visor en vivo'
            : `enviado mediante ${emailRes.provider}`;

          sendJson(res, 200, {
            ok: true,
            sent: true,
            provider: emailRes.provider,
            previewUrl: emailRes.previewUrl,
            message: emailRes.previewUrl
              ? `¡Correo con diseño visual OffertGames generado con éxito! Pulsa para abrir el visor en vivo.`
              : `¡Correo de aviso enviado con éxito a ${body.to} con la oferta de ${title}!`
          });
        } else {
          sendJson(res, 500, {
            ok: false,
            error: emailRes.error || 'No se pudo enviar el correo de aviso'
          });
        }
        return;
      } catch (err: any) {
        sendJson(res, 500, { ok: false, error: err?.message || 'Error al enviar correo de prueba' });
        return;
      }
    }

    // 6. GET /api/alerts/preview-html - Generates sample HTML email for in-app preview modal
    if (req.method === 'GET' && url.startsWith('/api/alerts/preview-html')) {
      const sampleHtml = buildVisualEmailHtml({
        to: 'tu_correo@gmail.com',
        gameTitle: 'Elden Ring',
        currentPrice: 19.99,
        regularPrice: 59.99,
        maxPrice: 20,
        storeName: 'Steam',
        buyUrl: 'https://store.steampowered.com/app/1245620/',
        coverImage: 'https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/1245620/capsule_616x353.jpg'
      });

      res.statusCode = 200;
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.end(sampleHtml);
      return;
    }

    next();
  });
}
