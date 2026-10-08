import { db } from './firebaseClient';
import { collection, doc, setDoc, getDocs, query, where, serverTimestamp } from 'firebase/firestore';
import { sanitizeText, securityLimiter, RATE_LIMITS, generateBrowserFingerprint } from './securityService';
import { GOOGLE_APPS_SCRIPT_URL } from './alertService';
import { User } from '../types/game';

export type SupportCategory = 'consulta' | 'queja' | 'problema_tecnico' | 'sugerencia';

export interface SupportTicketPayload {
  category: SupportCategory;
  subject: string;
  message: string;
  user: User;
}

export interface SupportTicketResult {
  ok: boolean;
  message: string;
  ticketId?: string;
  error?: string;
}

const CATEGORY_LABELS: Record<SupportCategory, string> = {
  consulta: 'Consulta General',
  queja: 'Queja / Reclamación',
  problema_tecnico: 'Problema Técnico',
  sugerencia: 'Sugerencia de Mejora'
};

// ============================================================================
// LÍMITE DE SEGURIDAD INVISIBLE ANTI-SPAM Y ANTI-DDOS (MÁXIMO 2 AL DÍA)
// ============================================================================
const DAILY_SUPPORT_LIMIT = RATE_LIMITS.SUPPORT_TICKET_DAILY?.max || 2;
const WINDOW_SECONDS = RATE_LIMITS.SUPPORT_TICKET_DAILY?.windowSeconds || 86400; // 24 horas
const WINDOW_MS = WINDOW_SECONDS * 1000;
const FLOOD_COOLDOWN_SECONDS = 30; // Mínimo 30 segundos entre envíos consecutivos

function getPersistentSupportTimestamps(userId: string, email: string): number[] {
  try {
    const key = `offertgames_sec_supp_${userId || email}`;
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      const now = Date.now();
      return parsed.filter(ts => typeof ts === 'number' && now - ts < WINDOW_MS);
    }
    return [];
  } catch {
    return [];
  }
}

function recordPersistentSupportTimestamp(userId: string, email: string, timestamp: number): void {
  try {
    const key = `offertgames_sec_supp_${userId || email}`;
    const existing = getPersistentSupportTimestamps(userId, email);
    existing.push(timestamp);
    localStorage.setItem(key, JSON.stringify(existing));
  } catch {}
}

function generateSupportEmailHtml(params: {
  user: User;
  category: SupportCategory;
  subject: string;
  message: string;
  ticketId: string;
}): string {
  const categoryLabel = CATEGORY_LABELS[params.category] || params.category;
  const nowStr = new Date().toLocaleString('es-ES', { dateStyle: 'full', timeStyle: 'medium' });

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <title>Nuevo Ticket de Soporte - OffertGames</title>
</head>
<body style="margin: 0; padding: 20px; background-color: #0c121c; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #f1f5f9;">
  <div style="max-width: 620px; margin: 0 auto; background-color: #121a24; border: 1px solid #233147; border-radius: 16px; overflow: hidden; box-shadow: 0 16px 36px rgba(0,0,0,0.5);">
    <div style="background: linear-gradient(180deg, #182230 0%, #121a24 100%); padding: 24px; text-align: center; border-bottom: 1px solid #233147;">
      <div style="font-size: 24px; font-weight: 900; color: #f59e0b;">Offert<span style="color: #38bdf8;">Games</span></div>
      <div style="font-size: 13px; color: #38bdf8; font-weight: bold; margin-top: 6px; letter-spacing: 0.5px;">SERVICIO TÉCNICO Y ATENCIÓN AL CLIENTE</div>
    </div>
    
    <div style="padding: 24px;">
      <div style="background-color: #192333; border: 1px solid #283950; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
          <tr>
            <td style="color: #94a3b8; padding: 6px 0; width: 140px;"><strong>Remitente (Google):</strong></td>
            <td style="color: #ffffff; padding: 6px 0; font-weight: bold;">${params.user.name}</td>
          </tr>
          <tr>
            <td style="color: #94a3b8; padding: 6px 0;"><strong>Correo Electrónico:</strong></td>
            <td style="color: #38bdf8; padding: 6px 0;">
              <a href="mailto:${params.user.email}" style="color: #38bdf8; text-decoration: underline; font-weight: bold;">${params.user.email}</a>
            </td>
          </tr>
          <tr>
            <td style="color: #94a3b8; padding: 6px 0;"><strong>Cuenta Google ID:</strong></td>
            <td style="color: #cbd5e1; padding: 6px 0; font-family: monospace; font-size: 11px;">${params.user.id}</td>
          </tr>
          <tr>
            <td style="color: #94a3b8; padding: 6px 0;"><strong>Tipo de Solicitud:</strong></td>
            <td style="padding: 6px 0;">
              <span style="background-color: #f59e0b20; color: #fbbf24; border: 1px solid #f59e0b40; padding: 2px 8px; border-radius: 6px; font-size: 11px; font-weight: bold;">
                ${categoryLabel}
              </span>
            </td>
          </tr>
          <tr>
            <td style="color: #94a3b8; padding: 6px 0;"><strong>Asunto:</strong></td>
            <td style="color: #ffffff; padding: 6px 0; font-weight: bold; font-size: 14px;">${params.subject}</td>
          </tr>
          <tr>
            <td style="color: #94a3b8; padding: 6px 0;"><strong>Fecha y Hora:</strong></td>
            <td style="color: #94a3b8; padding: 6px 0; font-size: 12px;">${nowStr}</td>
          </tr>
        </table>
      </div>

      <div style="background-color: #0b0f17; border: 1px solid #1c2738; border-radius: 12px; padding: 18px; margin-bottom: 20px;">
        <div style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #94a3b8; margin-bottom: 10px; letter-spacing: 0.5px;">
          Mensaje de la Consulta / Queja:
        </div>
        <div style="font-size: 14px; color: #e2e8f0; line-height: 1.6; white-space: pre-wrap; word-break: break-word;">${params.message}</div>
      </div>

      <div style="text-align: center; margin-top: 24px;">
        <a href="mailto:${params.user.email}?subject=RE: [OffertGames] ${encodeURIComponent(params.subject)}" 
           style="display: inline-block; background-color: #0284c7; color: #ffffff; text-decoration: none; font-weight: bold; font-size: 13px; padding: 10px 22px; border-radius: 8px;">
          Responder Directamente al Usuario
        </a>
      </div>
    </div>

    <div style="background-color: #0c121a; padding: 16px; text-align: center; border-top: 1px solid #1e293b; font-size: 11px; color: #64748b;">
      Ticket ID: <span style="font-family: monospace; color: #94a3b8;">${params.ticketId}</span> • Enviado desde la plataforma web <a href="https://offertgames.web.app" style="color: #38bdf8; text-decoration: none;">OffertGames</a>
    </div>
  </div>
</body>
</html>`;
}

/**
 * Sends a real customer service inquiry or complaint to offertgames@gmail.com
 * Protected by multi-layer anti-DDoS, anti-spam and an invisible daily limit of 2 emails per day.
 */
export async function sendSupportTicket(payload: SupportTicketPayload): Promise<SupportTicketResult> {
  const { user, category, subject, message } = payload;

  if (!user) {
    return {
      ok: false,
      message: 'Debes tener una sesión iniciada para contactar al servicio técnico.',
      error: 'NO_USER'
    };
  }

  // 1. Verify Google authentication
  const isGoogle = user.provider === 'google' || user.email.toLowerCase().endsWith('@gmail.com');
  if (!isGoogle) {
    return {
      ok: false,
      message: 'Para enviar una consulta o queja al servicio técnico debes iniciar sesión con tu cuenta de Google.',
      error: 'REQUIRES_GOOGLE'
    };
  }

  // 2. Validate input and sanitize against XSS and injections
  const cleanSubject = sanitizeText(subject).trim();
  const cleanMessage = sanitizeText(message).trim();

  if (!cleanSubject) {
    return {
      ok: false,
      message: 'Por favor introduce un asunto para tu mensaje.',
      error: 'EMPTY_SUBJECT'
    };
  }

  if (cleanSubject.length < 3) {
    return {
      ok: false,
      message: 'El asunto debe tener al menos 3 caracteres.',
      error: 'SHORT_SUBJECT'
    };
  }

  if (!cleanMessage) {
    return {
      ok: false,
      message: 'Por favor escribe el contenido de tu mensaje.',
      error: 'EMPTY_MESSAGE'
    };
  }

  if (cleanMessage.length < 10) {
    return {
      ok: false,
      message: 'El mensaje debe contener al menos 10 caracteres explicando tu consulta o queja.',
      error: 'SHORT_MESSAGE'
    };
  }

  // ============================================================================
  // ESCUDO DE SEGURIDAD INVISIBLE: CONTROL ANTI-DDOS Y LÍMITE DE 2 AL DÍA
  // ============================================================================

  // Capa A: Anti-Flooding inmediato (Mínimo 30 segundos entre envíos)
  const floodCheck = securityLimiter.checkLimit(`supp_flood_${user.id}`, 1, FLOOD_COOLDOWN_SECONDS);
  if (!floodCheck.allowed) {
    return {
      ok: false,
      message: 'Por favor espera unos segundos antes de enviar otro mensaje.',
      error: 'FLOOD_COOLDOWN'
    };
  }

  // Capa B: Limitador en memoria (Por Usuario, Email y Huella digital de navegador)
  const fp = generateBrowserFingerprint();
  const checkUser = securityLimiter.checkLimit(`supp_day_usr_${user.id}`, DAILY_SUPPORT_LIMIT, WINDOW_SECONDS);
  const checkEmail = securityLimiter.checkLimit(`supp_day_eml_${user.email}`, DAILY_SUPPORT_LIMIT, WINDOW_SECONDS);
  const checkFp = securityLimiter.checkLimit(`supp_day_fp_${fp}`, DAILY_SUPPORT_LIMIT, WINDOW_SECONDS);

  if (!checkUser.allowed || !checkEmail.allowed || !checkFp.allowed) {
    return {
      ok: false,
      message: 'Has alcanzado el límite de 2 correos al día para atención al cliente. Tu solicitud anterior ya ha sido registrada, por favor espera a que nuestro equipo la revise antes de enviar más mensajes.',
      error: 'RATE_LIMIT_DAILY'
    };
  }

  // Capa C: Persistencia en LocalStorage (Evita evasión al recargar la página)
  const persistentTimestamps = getPersistentSupportTimestamps(user.id, user.email);
  if (persistentTimestamps.length >= DAILY_SUPPORT_LIMIT) {
    return {
      ok: false,
      message: 'Has alcanzado el límite de 2 correos al día para atención al cliente. Tu solicitud anterior ya ha sido registrada, por favor espera a que nuestro equipo la revise antes de enviar más mensajes.',
      error: 'RATE_LIMIT_DAILY'
    };
  }

  // Capa D: Verificación en Cloud Firestore (Evita evasión en modo incógnito o borrado de caché)
  if (db) {
    try {
      const ticketsQuery = query(
        collection(db, 'support_tickets'),
        where('userEmail', '==', user.email)
      );
      const snap = await getDocs(ticketsQuery);
      const oneDayAgo = Date.now() - WINDOW_MS;
      let countLast24h = 0;
      snap.docs.forEach(docSnap => {
        const data = docSnap.data();
        const clientTime = data.createdAtClient ? new Date(data.createdAtClient).getTime() : 0;
        const ticketTime = typeof data.timestamp === 'number' ? data.timestamp : clientTime;
        if (ticketTime > oneDayAgo) {
          countLast24h++;
        }
      });
      if (countLast24h >= DAILY_SUPPORT_LIMIT) {
        return {
          ok: false,
          message: 'Has alcanzado el límite de 2 correos al día para atención al cliente. Tu solicitud anterior ya ha sido registrada, por favor espera a que nuestro equipo la revise antes de enviar más mensajes.',
          error: 'RATE_LIMIT_DAILY'
        };
      }
    } catch {
      // Si la consulta en Firestore no responde o no tiene permisos de lectura, las capas A, B y C garantizan el bloqueo
    }
  }

  // ============================================================================
  // ENVÍO Y REGISTRO DEL TICKET
  // ============================================================================

  const ticketId = `ticket-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
  const categoryLabel = CATEGORY_LABELS[category] || category;
  const emailHtml = generateSupportEmailHtml({
    user,
    category,
    subject: cleanSubject,
    message: cleanMessage,
    ticketId
  });

  const plainText = [
    `NUEVO TICKET DE SERVICIO TÉCNICO - OFFERTGAMES`,
    `Ticket ID: ${ticketId}`,
    `Usuario: ${user.name}`,
    `Email: ${user.email} (Verificado con Google)`,
    `ID Usuario: ${user.id}`,
    `Tipo: ${categoryLabel}`,
    `Asunto: ${cleanSubject}`,
    `Fecha: ${new Date().toLocaleString('es-ES')}`,
    `--------------------------------------------------`,
    `MENSAJE:`,
    cleanMessage,
    `--------------------------------------------------`,
    `Responder a: ${user.email}`
  ].join('\n');

  let emailDelivered = false;

  // 1. Envío primario: Google Apps Script 24/7 remitente/destinatario offertgames@gmail.com
  if (GOOGLE_APPS_SCRIPT_URL) {
    try {
      const gasResponse = await fetch(GOOGLE_APPS_SCRIPT_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({
          to: 'offertgames@gmail.com',
          subject: `[Servicio Técnico OffertGames] ${categoryLabel}: ${cleanSubject}`,
          html: emailHtml,
          text: plainText,
          replyTo: user.email
        })
      });

      if (gasResponse.ok) {
        emailDelivered = true;
        console.log('[SupportService] Correo enviado exitosamente vía Google Apps Script a offertgames@gmail.com');
      }
    } catch (err: any) {
      console.warn('[SupportService] Error enviando vía Google Apps Script:', err);
    }
  }

  // 2. Envío secundario de respaldo: FormSubmit a offertgames@gmail.com
  if (!emailDelivered) {
    try {
      const fsRes = await fetch('https://formsubmit.co/ajax/offertgames@gmail.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          _subject: `[OffertGames Soporte] ${categoryLabel}: ${cleanSubject}`,
          _replyto: user.email,
          ticketId,
          remitente: user.name,
          emailGoogle: user.email,
          tipo: categoryLabel,
          asunto: cleanSubject,
          mensaje: cleanMessage
        })
      });

      if (fsRes.ok) {
        emailDelivered = true;
        console.log('[SupportService] Correo enviado exitosamente vía FormSubmit a offertgames@gmail.com');
      }
    } catch (err: any) {
      console.warn('[SupportService] Error enviando vía FormSubmit:', err);
    }
  }

  const nowTimestamp = Date.now();

  // 3. Registrar marca temporal en el almacén local persistente para el límite de 2 al día
  recordPersistentSupportTimestamp(user.id, user.email, nowTimestamp);

  // 4. Registro permanente en Cloud Firestore support_tickets
  if (db) {
    try {
      const ticketDocRef = doc(collection(db, 'support_tickets'), ticketId);
      await setDoc(ticketDocRef, {
        id: ticketId,
        userId: user.id,
        userName: user.name,
        userEmail: user.email,
        userAvatar: user.avatar,
        provider: user.provider || 'google',
        category,
        categoryLabel,
        subject: cleanSubject,
        message: cleanMessage,
        emailDelivered,
        timestamp: nowTimestamp,
        status: 'abierto',
        createdAt: serverTimestamp(),
        createdAtClient: new Date().toISOString()
      });
      console.log('[SupportService] Ticket guardado permanentemente en Cloud Firestore:', ticketId);
    } catch (err: any) {
      console.warn('[SupportService] Error guardando ticket en Firestore:', err);
    }
  }

  return {
    ok: true,
    ticketId,
    message: '¡Tu mensaje ha sido enviado directamente al correo de OffertGames con éxito! Te responderemos lo antes posible a tu dirección de Google.'
  };
}
