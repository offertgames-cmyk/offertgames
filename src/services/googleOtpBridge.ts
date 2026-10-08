type BridgeResponse = {
  ok: boolean;
  message?: string;
  challengeId?: string;
  expiresInSeconds?: number;
  email?: string;
  uid?: string;
};

type BridgeAction = 'request' | 'verify';

type PendingRequest = {
  resolve: (value: BridgeResponse) => void;
  reject: (reason: Error) => void;
  timeoutId: number;
};

const SCRIPT_URL = (import.meta.env.VITE_GOOGLE_OTP_SCRIPT_URL || '').trim();
const TRUSTED_SCRIPT_HOSTS = new Set(['script.google.com', 'script.googleusercontent.com']);
const TRUSTED_SCRIPT_SUFFIX = '.script.googleusercontent.com';
const RESPONSE_TIMEOUT_MS = 30000;

let bridgeFrame: HTMLIFrameElement | null = null;
let bridgeOrigin: string | null = null;
let messageListenerInstalled = false;
let nextReadyWaiter = 0;
const readyWaiters = new Map<number, {
  resolve: (origin: string) => void;
  reject: (reason: Error) => void;
  timeoutId: number;
}>();
const pendingRequests = new Map<string, PendingRequest>();

function isTrustedScriptOrigin(origin: string): boolean {
  try {
    const parsed = new URL(origin);
    return parsed.protocol === 'https:' &&
      (TRUSTED_SCRIPT_HOSTS.has(parsed.hostname) || parsed.hostname.endsWith(TRUSTED_SCRIPT_SUFFIX));
  } catch {
    return false;
  }
}

function validateScriptUrl(): string {
  if (!SCRIPT_URL) {
    throw new Error('El envío real de códigos todavía no está enlazado. Falta configurar Apps Script.');
  }
  const parsed = new URL(SCRIPT_URL);
  if (
    parsed.protocol !== 'https:' ||
    !TRUSTED_SCRIPT_HOSTS.has(parsed.hostname) ||
    !parsed.pathname.includes('/macros/s/')
  ) {
    throw new Error('La dirección del servicio de códigos no es válida.');
  }
  return parsed.toString();
}

function handleBridgeMessage(event: MessageEvent): void {
  if (!bridgeFrame || event.source !== bridgeFrame.contentWindow || !isTrustedScriptOrigin(event.origin)) {
    return;
  }

  const message = event.data;
  if (!message || typeof message !== 'object') return;

  if (message.type === 'offertgames-google-otp-ready') {
    bridgeOrigin = event.origin;
    readyWaiters.forEach((waiter) => {
      window.clearTimeout(waiter.timeoutId);
      waiter.resolve(event.origin);
    });
    readyWaiters.clear();
    return;
  }

  if (message.type !== 'offertgames-google-otp-result' || typeof message.requestId !== 'string') {
    return;
  }
  const pending = pendingRequests.get(message.requestId);
  if (!pending) return;

  window.clearTimeout(pending.timeoutId);
  pendingRequests.delete(message.requestId);
  const response = message.response;
  if (!response || typeof response.ok !== 'boolean') {
    pending.reject(new Error('El servicio devolvió una respuesta no válida.'));
    return;
  }
  pending.resolve(response as BridgeResponse);
}

function ensureBridgeListener(): void {
  if (messageListenerInstalled) return;
  window.addEventListener('message', handleBridgeMessage);
  messageListenerInstalled = true;
}

function getBridgeOrigin(): Promise<string> {
  if (bridgeOrigin) return Promise.resolve(bridgeOrigin);
  ensureBridgeListener();

  return new Promise<string>((resolve, reject) => {
    const waiterId = ++nextReadyWaiter;
    const timeoutId = window.setTimeout(() => {
      readyWaiters.delete(waiterId);
      reject(new Error('No se pudo conectar con el envío de correo de OffertGames.'));
    }, RESPONSE_TIMEOUT_MS);
    readyWaiters.set(waiterId, { resolve, reject, timeoutId });

    if (!bridgeFrame) {
      try {
        const frame = document.createElement('iframe');
        frame.title = 'Servicio de verificación de OffertGames';
        frame.setAttribute('aria-hidden', 'true');
        frame.tabIndex = -1;
        frame.referrerPolicy = 'strict-origin';
        frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:1px;height:1px;opacity:0;pointer-events:none;border:0';
        bridgeFrame = frame;
        frame.src = validateScriptUrl();
        document.body.appendChild(frame);
      } catch (error) {
        window.clearTimeout(timeoutId);
        readyWaiters.delete(waiterId);
        reject(error instanceof Error ? error : new Error('No se pudo iniciar el servicio de códigos.'));
      }
    }
  });
}

function newRequestId(): string {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return 'req-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2);
}

async function callBridge(action: BridgeAction, payload: Record<string, string>): Promise<BridgeResponse> {
  const origin = await getBridgeOrigin();
  const target = bridgeFrame?.contentWindow;
  if (!target) throw new Error('El servicio de códigos no está disponible.');

  const requestId = newRequestId();
  return new Promise<BridgeResponse>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      pendingRequests.delete(requestId);
      reject(new Error('El servicio de correo no respondió a tiempo.'));
    }, RESPONSE_TIMEOUT_MS);
    pendingRequests.set(requestId, { resolve, reject, timeoutId });
    target.postMessage({
      type: 'offertgames-google-otp-request',
      requestId,
      action,
      payload
    }, origin);
  });
}

export function requestGoogleEmailCode(idToken: string): Promise<BridgeResponse> {
  if (!idToken) return Promise.reject(new Error('Firebase no devolvió una sesión válida de Google.'));
  return callBridge('request', { idToken });
}

export function verifyGoogleEmailCode(challengeId: string, code: string): Promise<BridgeResponse> {
  if (!challengeId || !/^\d{6}$/.test(code)) {
    return Promise.reject(new Error('Introduce el código de seis cifras.'));
  }
  return callBridge('verify', { challengeId, code });
}
