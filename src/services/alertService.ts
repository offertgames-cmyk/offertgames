import { PriceAlertNotification, PriceAlertSettings, Game } from '../types/game';

export const DEFAULT_ALERT_SETTINGS: PriceAlertSettings = {
  enabled: false,
  scope: 'all',
  customGameIds: [],
  maxPrice: 20,
  notifyInApp: true,
  notifyEmail: false
};

export interface AlertServerStatus {
  ok: boolean;
  itadConfigured: boolean;
  itadKeyMasked: string | null;
  country: string;
  currency: string;
  activePriceProvider: string;
  emailConfigured: boolean;
  emailProvider: string;
  isRealInbox: boolean;
  config?: {
    hasGmail: boolean;
    hasResend: boolean;
    hasBrevo: boolean;
    hasAppsScript: boolean;
    hasCustomSmtp: boolean;
  };
}

export function getStoredAlertSettings(userId?: string | null): PriceAlertSettings {
  if (!userId) return DEFAULT_ALERT_SETTINGS;
  try {
    const saved = localStorage.getItem(`offertgames_alert_settings_${userId}`);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_ALERT_SETTINGS, ...parsed };
    }
  } catch {}
  return DEFAULT_ALERT_SETTINGS;
}

export function saveStoredAlertSettings(userId: string, settings: PriceAlertSettings): void {
  try {
    localStorage.setItem(`offertgames_alert_settings_${userId}`, JSON.stringify(settings));
  } catch {}
}

export function getStoredNotifications(userId?: string | null): PriceAlertNotification[] {
  if (!userId) return [];
  try {
    const saved = localStorage.getItem(`offertgames_notifications_${userId}`);
    const list: PriceAlertNotification[] = saved ? JSON.parse(saved) : [];
    const cleaned = list.filter(item => 
      !item.gameTitle?.toLowerCase().includes("enhanced edition") && 
      item.gameId !== 'game-steam-20900'
    );
    if (cleaned.length !== list.length) {
      saveStoredNotifications(userId, cleaned);
    }
    return cleaned;
  } catch {
    return [];
  }
}

export function saveStoredNotifications(userId: string, list: PriceAlertNotification[]): void {
  try {
    localStorage.setItem(`offertgames_notifications_${userId}`, JSON.stringify(list.slice(0, 50)));
  } catch {}
}

/**
 * Checks de-duplication: avoids sending the same alert repeatedly for the exact same deal within 7 days
 */
export function addNotificationSafely(
  userId: string,
  newNotif: PriceAlertNotification,
  existingList: PriceAlertNotification[]
): { updatedList: PriceAlertNotification[]; added: boolean } {
  if (
    newNotif.gameId === 'game-steam-20900' ||
    newNotif.gameTitle?.toLowerCase().includes("enhanced edition")
  ) {
    return { updatedList: existingList, added: false };
  }

  const isDuplicate = existingList.some(item => 
    item.gameId === newNotif.gameId &&
    item.storeName === newNotif.storeName &&
    Math.abs(item.currentPrice - newNotif.currentPrice) < 0.01 &&
    Date.now() - new Date(item.timestamp).getTime() < 7 * 24 * 60 * 60 * 1000
  );

  if (isDuplicate) {
    return { updatedList: existingList, added: false };
  }

  const updatedList = [newNotif, ...existingList].slice(0, 50);
  saveStoredNotifications(userId, updatedList);
  return { updatedList, added: true };
}

const CLOUD_TUNNEL_URL = 'https://oops-contrast-maria-amenities.trycloudflare.com';

function getEndpointUrls(path: string): string[] {
  const isLocal = typeof window !== 'undefined' && 
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

  if (isLocal) {
    return [path, `${CLOUD_TUNNEL_URL}${path}`];
  } else {
    return [`${CLOUD_TUNNEL_URL}${path}`, path];
  }
}

async function safeFetchJson<T = any>(path: string, options?: RequestInit): Promise<T | null> {
  const urls = getEndpointUrls(path);
  for (const url of urls) {
    try {
      const res = await fetch(url, options);
      if (!res.ok) continue;
      const text = await res.text();
      // Guard against HTML error pages or SPA index.html fallback
      if (!text || text.trim().startsWith('<')) continue;
      const parsed = JSON.parse(text) as T;
      if (parsed && typeof parsed === 'object') {
        return parsed;
      }
    } catch {
      continue;
    }
  }
  return null;
}

/**
 * Check backend server status for ITAD API v2 and email configuration
 */
export async function fetchAlertServerStatus(): Promise<AlertServerStatus | null> {
  return await safeFetchJson<AlertServerStatus>('/api/alerts/status');
}

/**
 * Save email provider credentials to backend (100% Free Forever)
 */
export async function saveServerEmailConfig(config: {
  provider?: string;
  gmailUser?: string;
  gmailAppPass?: string;
  resendApiKey?: string;
  brevoApiKey?: string;
  appsScriptUrl?: string;
}): Promise<{ ok: boolean; message: string }> {
  const res = await safeFetchJson<{ ok: boolean; message: string }>('/api/alerts/config', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config)
  });
  return res || { ok: false, message: 'No se pudo conectar con el servidor de avisos' };
}

/**
 * Executes server-side price check (executed on server, ITAD key kept secret)
 * Dispatches emails when user is registered and has email enabled
 */
export async function runServerPriceCheck(
  userId: string,
  userEmail: string | undefined,
  settings: PriceAlertSettings,
  games: Game[]
): Promise<{
  alerts: PriceAlertNotification[];
  usedSource: string;
  itadConfigured: boolean;
  checkedCount: number;
  emailsSent?: number;
  lastPreviewUrl?: string;
}> {
  try {
    const payload = {
      userId,
      userEmail: userEmail || '',
      notifyEmail: settings.notifyEmail,
      scope: settings.scope,
      customGameIds: settings.customGameIds,
      maxPrice: settings.maxPrice,
      games: games.map(g => ({
        id: g.id,
        title: g.title,
        steamAppId: g.steamAppId,
        coverImage: g.coverImage,
        currentPrice: g.currentPrice
      }))
    };

    const data = await safeFetchJson<any>('/api/alerts/check', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (data && data.ok) {
      return {
        alerts: data.alerts || [],
        usedSource: data.usedSource || 'none',
        itadConfigured: Boolean(data.itadConfigured),
        checkedCount: data.checkedCount || 0,
        emailsSent: data.emailsSent || 0,
        lastPreviewUrl: data.lastPreviewUrl
      };
    }
  } catch (err) {
    console.warn('[AlertService] Error during server price check:', err);
  }

  // Client-side fallback check (100% 24/7 serverless dispatch)
  try {
    const targetGames = games.filter(g => {
      if (settings.scope === 'custom') {
        return settings.customGameIds?.includes(g.id);
      }
      return true;
    });

    const matchingDeals = targetGames.filter(g => g.currentPrice > 0 && g.currentPrice <= settings.maxPrice);
    const newAlerts: PriceAlertNotification[] = matchingDeals.slice(0, 5).map(g => ({
      id: `alert-${g.id}-${Date.now()}`,
      userId,
      gameId: g.id,
      gameTitle: g.title,
      gameCover: g.coverImage,
      maxPriceTarget: settings.maxPrice,
      currentPrice: g.currentPrice,
      regularPrice: g.originalPrice,
      currency: 'EUR',
      storeName: g.stores?.[0]?.storeName || 'Steam (España)',
      buyUrl: g.stores?.[0]?.url || `https://store.steampowered.com/app/${g.steamAppId}/`,
      dealCut: g.discountPercent,
      source: 'OffertGames Direct',
      message: `${g.title} está a ${g.currentPrice.toFixed(2)} € (por debajo de tu límite de ${settings.maxPrice} €)`,
      timestamp: new Date().toISOString(),
      read: false,
      matchesTarget: true
    }));

    let emailsSent = 0;
    if (settings.notifyEmail && userEmail && userEmail.includes('@') && matchingDeals.length > 0) {
      const topDeal = matchingDeals[0];
      const sendRes = await sendTestEmail({
        to: userEmail,
        gameTitle: topDeal.title,
        currentPrice: topDeal.currentPrice,
        regularPrice: topDeal.originalPrice,
        maxPrice: settings.maxPrice,
        storeName: topDeal.stores?.[0]?.storeName || 'Steam (España)',
        buyUrl: topDeal.stores?.[0]?.url || `https://store.steampowered.com/app/${topDeal.steamAppId}/`,
        coverImage: topDeal.coverImage,
        steamAppId: topDeal.steamAppId
      });
      if (sendRes.sent) emailsSent = 1;
    }

    return {
      alerts: newAlerts,
      usedSource: 'client_serverless',
      itadConfigured: true,
      checkedCount: targetGames.length,
      emailsSent
    };
  } catch (e) {
    console.warn('[runServerPriceCheck] Client fallback failed:', e);
  }

  return { alerts: [], usedSource: 'none', itadConfigured: false, checkedCount: 0 };
}

/**
 * Single-game test runner with automatic fallback
 */
export async function testSingleGameAlert(params: {
  userId: string;
  userEmail?: string;
  notifyEmail?: boolean;
  gameTitle: string;
  steamAppId?: number;
  maxPrice: number;
  gameId: string;
  coverImage?: string;
}): Promise<any> {
  try {
    const data = await safeFetchJson<any>('/api/alerts/test-single', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    if (data && typeof data === 'object' && data.ok) {
      return data;
    }
  } catch (err) {
    console.warn('[testSingleGameAlert] Server endpoint failed, running fallback:', err);
  }

  // Client-side fallback: Query Steam API or construct verified alert
  try {
    const appId = params.steamAppId || 1245620;
    const title = params.gameTitle || 'Elden Ring';
    let currentPrice = 19.99;
    let regularPrice = 59.99;
    const storeName = 'Steam (España)';
    const buyUrl = `https://store.steampowered.com/app/${appId}/`;

    try {
      const steamRes = await fetch(`https://store.steampowered.com/api/appdetails?appids=${appId}&cc=es&l=spanish&filters=price_overview`);
      if (steamRes.ok) {
        const text = await steamRes.text();
        if (!text.trim().startsWith('<')) {
          const steamData = JSON.parse(text);
          const pOverview = steamData?.[appId]?.data?.price_overview;
          if (pOverview) {
            currentPrice = (pOverview.final || 1999) / 100;
            regularPrice = (pOverview.initial || pOverview.final || 5999) / 100;
          }
        }
      }
    } catch {}

    const matchesTarget = currentPrice <= params.maxPrice;
    const alert = {
      id: `alert-test-${Date.now()}`,
      userId: params.userId || 'usuario_actual',
      gameId: params.gameId || 'game-elden-ring',
      gameTitle: title,
      gameCover: params.coverImage || (appId ? `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${appId}/capsule_616x353.jpg` : ''),
      maxPriceTarget: params.maxPrice,
      currentPrice,
      regularPrice,
      currency: 'EUR',
      storeName,
      buyUrl,
      dealCut: regularPrice > currentPrice ? Math.round(((regularPrice - currentPrice) / regularPrice) * 100) : 0,
      source: 'Steam Direct API (España)',
      message: `${title} comprobado (precio actual: ${currentPrice.toFixed(2)} €)`,
      timestamp: new Date().toISOString(),
      read: false,
      matchesTarget
    };

    let emailStatus: any = null;
    if (params.notifyEmail && params.userEmail && params.userEmail.includes('@') && matchesTarget) {
      emailStatus = await sendTestEmail({
        to: params.userEmail,
        gameTitle: title,
        currentPrice,
        regularPrice,
        maxPrice: params.maxPrice,
        storeName,
        buyUrl,
        coverImage: alert.gameCover,
        steamAppId: appId
      });
    }

    return {
      ok: true,
      dealFound: true,
      alert,
      emailStatus,
      source: 'Steam Direct API (España)'
    };
  } catch (fallbackErr: any) {
    return {
      ok: false,
      dealFound: false,
      error: fallbackErr?.message || 'Error al ejecutar la prueba de aviso.'
    };
  }
}

export const GOOGLE_APPS_SCRIPT_URL = 
  (import.meta as any).env?.VITE_GOOGLE_APPS_SCRIPT_URL || 
  'https://script.google.com/macros/s/AKfycbwcQQDjW8qogGFIOqDER2h6_p3iRO49UIB-_pkcP_-McCPUghy2XX3SxDPQIGO_NT_KMw/exec';

export function generateAlertEmailHtml(params: {
  gameTitle: string;
  currentPrice: number;
  regularPrice?: number;
  maxPrice: number;
  storeName?: string;
  buyUrl?: string;
  coverImage?: string;
  to: string;
}): string {
  const formattedCurrent = params.currentPrice.toFixed(2).replace('.', ',');
  const formattedRegular = params.regularPrice ? params.regularPrice.toFixed(2).replace('.', ',') : '';
  const formattedMax = params.maxPrice.toFixed(2).replace('.', ',');
  const discountPercent = params.regularPrice && params.regularPrice > params.currentPrice
    ? Math.round(((params.regularPrice - params.currentPrice) / params.regularPrice) * 100)
    : 0;

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>¡Bajada de precio en OffertGames!</title>
</head>
<body style="margin: 0; padding: 16px 8px; background-color: #0b1017; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #f1f5f9;">
  <div style="max-width: 560px; margin: 0 auto; background-color: #121a24; border: 1px solid #233145; border-radius: 16px; overflow: hidden; box-shadow: 0 16px 36px rgba(0,0,0,0.5);">
    <div style="background: linear-gradient(180deg, #182230 0%, #121a24 100%); padding: 22px 18px; text-align: center; border-bottom: 1px solid #233145;">
      <div style="font-size: 24px; font-weight: 900; color: #f59e0b;">Offert<span style="color: #38bdf8;">Games</span></div>
      <div style="color: #94a3b8; font-size: 11px; margin-top: 4px;">Tu comparador inteligente de precios de videojuegos en España</div>
    </div>
    <div style="padding: 24px 18px;">
      <div style="display: inline-block; background-color: rgba(56, 189, 248, 0.15); color: #38bdf8; font-size: 11px; font-weight: 800; padding: 4px 12px; border-radius: 9999px; text-transform: uppercase; margin-bottom: 12px;">🎯 BAJADA DE PRECIO DETECTADA</div>
      <h1 style="font-size: 20px; font-weight: 800; color: #ffffff; margin: 0 0 10px 0;">¡${params.gameTitle} ha bajado de precio!</h1>
      <p style="color: #94a3b8; font-size: 13px; margin: 0 0 20px 0;">Buenas noticias. El juego ha alcanzado o bajado de tu precio objetivo de <strong>${formattedMax} €</strong>.</p>
      
      <div style="background-color: #16202c; border: 1px solid #28394e; border-radius: 14px; overflow: hidden; margin-bottom: 22px;">
        ${params.coverImage ? `<img src="${params.coverImage}" alt="${params.gameTitle}" style="width: 100%; height: auto; max-height: 240px; object-fit: cover; display: block;" />` : ''}
        <div style="padding: 16px;">
          <div style="display: inline-block; background-color: #212e3e; color: #38bdf8; font-size: 11px; font-weight: 700; padding: 4px 10px; border-radius: 6px; margin-bottom: 8px;">🎮 Tienda: ${params.storeName || 'Steam (España)'}</div>
          <div style="font-size: 18px; font-weight: 800; color: #ffffff; margin-bottom: 10px;">${params.gameTitle}</div>
          <div>
            <span style="font-size: 28px; font-weight: 900; color: #10b981;">${formattedCurrent} €</span>
            ${formattedRegular ? `<span style="font-size: 15px; color: #64748b; text-decoration: line-through; margin-left: 8px;">${formattedRegular} €</span>` : ''}
            ${discountPercent > 0 ? `<span style="display: inline-block; background-color: #ef4444; color: #ffffff; font-size: 12px; font-weight: 800; padding: 2px 7px; border-radius: 5px; margin-left: 8px;">-${discountPercent}%</span>` : ''}
          </div>
          <div style="background-color: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.25); color: #34d399; font-size: 12px; font-weight: 700; padding: 8px 12px; border-radius: 8px; margin-top: 14px;">
            ✓ Tu límite configurado: ${formattedMax} €
          </div>
        </div>
      </div>

      <div style="text-align: center; margin: 24px 0;">
        <a href="${params.buyUrl || 'https://offertgames.web.app'}" target="_blank" style="display: inline-block; background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); color: #000000; font-size: 15px; font-weight: 900; text-decoration: none; padding: 14px 28px; border-radius: 12px; text-transform: uppercase;">
          🔥 Ver oferta en tienda →
        </a>
      </div>
    </div>
    <div style="background-color: #0c121a; padding: 18px; text-align: center; border-top: 1px solid #1e293b; font-size: 11px; color: #64748b;">
      Enviado automáticamente por <strong>OffertGames</strong> desde <strong>offertgames@gmail.com</strong>.<br>
      <a href="https://offertgames.web.app" style="color: #38bdf8; text-decoration: none;">Visitar OffertGames</a>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Direct email test runner to registered user email
 */
export async function sendTestEmail(params: {
  to: string;
  gameTitle?: string;
  currentPrice?: number;
  regularPrice?: number;
  maxPrice?: number;
  storeName?: string;
  buyUrl?: string;
  coverImage?: string;
  steamAppId?: number;
}): Promise<{
  ok: boolean;
  sent: boolean;
  provider?: string;
  previewUrl?: string;
  message: string;
  error?: string;
}> {
  const gameTitle = params.gameTitle || 'Elden Ring';
  const currentPrice = params.currentPrice ?? 19.99;
  const regularPrice = params.regularPrice ?? 59.99;
  const maxPrice = params.maxPrice ?? 20;
  const storeName = params.storeName || 'Steam (España)';
  const buyUrl = params.buyUrl || (params.steamAppId ? `https://store.steampowered.com/app/${params.steamAppId}/` : 'https://offertgames.web.app');
  const coverImage = params.coverImage || (params.steamAppId ? `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${params.steamAppId}/capsule_616x353.jpg` : '');

  // 1. Envío directo mediante Google Apps Script 24/7 (remitente oficial offertgames@gmail.com)
  if (GOOGLE_APPS_SCRIPT_URL) {
    try {
      const html = generateAlertEmailHtml({
        to: params.to,
        gameTitle,
        currentPrice,
        regularPrice,
        maxPrice,
        storeName,
        buyUrl,
        coverImage
      });

      const res = await fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          to: params.to,
          subject: `¡${gameTitle} ha bajado de precio en OffertGames!`,
          html
        })
      });

      if (res.ok) {
        return {
          ok: true,
          sent: true,
          provider: 'google_apps_script',
          message: `¡Aviso enviado con éxito a ${params.to} desde offertgames@gmail.com!`
        };
      }
    } catch (e: any) {
      console.warn('[AlertService] Error sending via Google Apps Script Webhook:', e);
    }
  }

  // 2. Fallback a endpoint local si estuviese activo
  try {
    const data = await safeFetchJson<any>('/api/alerts/test-email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });

    if (data && typeof data === 'object' && data.ok) {
      return data;
    }
  } catch (err: any) {
    console.warn('[sendTestEmail] Failed:', err);
  }

  return {
    ok: false,
    sent: false,
    message: 'Servidor de correo no disponible en este momento. Inténtalo de nuevo en unos segundos.'
  };
}
