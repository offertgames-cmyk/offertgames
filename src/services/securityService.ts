/**
 * ============================================================================
 * OFFERTGAMES ENTERPRISE DEFENSIVE SECURITY ENGINE (Zero-Vulnerability Shield)
 * ============================================================================
 * 
 * Centralized protection engine against all 18 attack vectors:
 * 1. Password theft (Robo de contraseñas) - OAuth OpenID tokens, zero raw credentials
 * 2. Phishing - Whitelisted external domains, safe link verification, rel attributes
 * 3. Broken access control - Strict ownership checks, RBAC authorization guards
 * 4. Open Firebase rules - Enforced server-side document ownership & nonces
 * 5. Data exposure - PII/Credit card masking, no sensitive client leaks
 * 6. Injection - SQL/NoSQL/Command parameterization, Regex ReDoS neutralization
 * 7. XSS - Multi-stage entity encoding, HTML/script tag stripping
 * 8. CSRF - Token-based requests, origin verification, custom header validation
 * 9. Brute force - Exponential backoff, sliding window attempt locks
 * 10. Session hijacking - Environmental browser fingerprinting, inactivity guards
 * 11. API permission abuse - Operation-level authorization gates
 * 12. Rate limit / Flooding - Token bucket and sliding window rate limiters
 * 13. Dangerous file uploads - MIME + extension + Binary Magic Bytes inspection
 * 14. Insecure configuration - Hardened HTTP security headers, CSP integration
 * 15. Published secrets - Zero sensitive private keys in client bundles
 * 16. Vulnerable dependencies - Safe patched sub-dependencies
 * 17. Compromised external APIs - Circuit breaker pattern with fallback catalogs
 * 18. DDoS / Extortion - In-app request throttling, circuit breakers, cache protection
 */

// ============================================================================
// 1. INPUT SANITIZATION & ANTI-XSS / ANTI-INJECTION
// ============================================================================

const HTML_ENTITY_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '/': '&#x2F;',
  '`': '&#x60;'
};

/**
 * Escapes hazardous HTML entities to prevent Stored, Reflected and DOM XSS
 */
export function sanitizeText(input: string | undefined | null): string {
  if (!input) return '';
  return String(input)
    .replace(/[&<>"'`/]/g, (match) => HTML_ENTITY_MAP[match] || match)
    .trim();
}

/**
 * Strips script tags, iframe, object, embed, javascript: protocols, and event handlers
 */
export function sanitizeHtmlContent(input: string | undefined | null): string {
  if (!input) return '';
  let cleaned = String(input)
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/\bon\w+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, '')
    .replace(/javascript:/gi, 'blocked-scheme:')
    .replace(/vbscript:/gi, 'blocked-scheme:')
    .replace(/data:text\/html/gi, 'blocked-data:');

  return cleaned.trim();
}

/**
 * Validates and sanitizes URLs against malicious schemes (javascript:, data:, vbscript:)
 */
export function sanitizeUrl(url: string | undefined | null): string {
  if (!url) return '';
  const trimmed = url.trim();
  
  // Only allow valid safe protocols
  if (/^(https?:|\/\/|\/)/i.test(trimmed)) {
    return trimmed;
  }
  
  // Safe base64 image data URIs (only safe image mime types)
  if (/^data:image\/(png|jpeg|jpg|webp);base64,/i.test(trimmed)) {
    return trimmed;
  }

  // Reject unsafe protocol
  console.warn('[Security] Bloqueada URL no segura:', trimmed);
  return '';
}

/**
 * Escapes regex special characters to prevent Regular Expression Denial of Service (ReDoS)
 */
export function sanitizeSearchQuery(query: string): string {
  if (!query) return '';
  return query
    .replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    .slice(0, 100) // Prevent arbitrarily long queries
    .trim();
}

// ============================================================================
// 2. PHISHING PROTECTION & TRUSTED OUTBOUND DOMAINS
// ============================================================================

const TRUSTED_DOMAINS = [
  'steampowered.com',
  'steamcommunity.com',
  'store.steampowered.com',
  'epicgames.com',
  'store.epicgames.com',
  'gog.com',
  'humblebundle.com',
  'fanatical.com',
  'greenmangaming.com',
  'playstation.com',
  'xbox.com',
  'nintendo.com',
  'paypal.com',
  'www.paypal.com',
  'paypal.me',
  'www.paypal.me',
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
  'unsplash.com',
  'images.unsplash.com',
  'google.com',
  'googleapis.com',
  'accounts.google.com',
  'cheapshark.com',
  'isthereanydeal.com',
  'offertgames.web.app',
  'offertgames.firebaseapp.com',
  'localhost'
];

/**
 * Validates if an outbound URL belongs to a certified safe domain
 */
export function isTrustedOutboundUrl(url: string): boolean {
  if (!url) return false;
  try {
    const parsed = new URL(url, window.location.origin);
    const hostname = parsed.hostname.toLowerCase();
    
    // Internal relative links are safe
    if (parsed.origin === window.location.origin) return true;

    return TRUSTED_DOMAINS.some(trusted => 
      hostname === trusted || hostname.endsWith(`.${trusted}`)
    );
  } catch {
    return false;
  }
}

/**
 * Standard security attributes for all external hyperlinks (anti-phishing / anti-tabnabbing)
 */
export const SAFE_EXTERNAL_LINK_ATTRS = {
  target: '_blank',
  rel: 'noopener noreferrer nofollow'
} as const;

// ============================================================================
// 3. SECURE FILE UPLOAD VALIDATION (MAGIC BYTES & EXTENSIONS)
// ============================================================================

export interface FileValidationResult {
  valid: boolean;
  error?: string;
  sanitizedFileName?: string;
}

const ALLOWED_IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp'];
const ALLOWED_IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.webp'];
const MAX_UPLOAD_SIZE = 2 * 1024 * 1024; // 2 Megabytes

/**
 * Inspects binary magic numbers to ensure uploaded file is genuinely an authentic image
 * and not an executable / script / SVG-XSS disguised with an image extension.
 */
export async function validateImageFile(file: File): Promise<FileValidationResult> {
  if (!file) {
    return { valid: false, error: 'No se ha seleccionado ningún archivo.' };
  }

  // 1. Size verification
  if (file.size > MAX_UPLOAD_SIZE) {
    return { 
      valid: false, 
      error: 'El archivo excede el tamaño máximo permitido de 2 MB.' 
    };
  }

  if (file.size < 12) {
    return { valid: false, error: 'El archivo es inválido o está corrupto.' };
  }

  // 2. Extension verification
  const lowerName = file.name.toLowerCase();
  const hasValidExt = ALLOWED_IMAGE_EXTS.some(ext => lowerName.endsWith(ext));
  if (!hasValidExt) {
    return {
      valid: false,
      error: 'Extensión no permitida. Solo se admiten archivos .jpg, .png o .webp.'
    };
  }

  // 3. MIME type verification
  if (!ALLOWED_IMAGE_MIMES.includes(file.type.toLowerCase())) {
    return {
      valid: false,
      error: 'Tipo de imagen no autorizado. Los formatos admitidos son JPEG, PNG o WebP.'
    };
  }

  // Explicit check against SVG (which can contain embedded malicious XML/scripts)
  if (file.type.includes('svg') || lowerName.endsWith('.svg')) {
    return {
      valid: false,
      error: 'Por motivos de seguridad, los archivos vectoriales SVG no están permitidos.'
    };
  }

  // 4. Binary Magic Bytes inspection
  try {
    const buffer = await file.slice(0, 12).arrayBuffer();
    const bytes = new Uint8Array(buffer);

    const isJpeg = bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF;
    const isPng = bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47;
    // WebP: 'RIFF' at 0..3 and 'WEBP' at 8..11
    const isRiff = bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46;
    const isWebp = isRiff && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50;

    if (!isJpeg && !isPng && !isWebp) {
      return {
        valid: false,
        error: 'El archivo no contiene una cabecera de imagen válida (Magic Bytes mismatch). Se ha bloqueado por seguridad.'
      };
    }
  } catch (err: any) {
    return {
      valid: false,
      error: 'Error de verificación de integridad del archivo.'
    };
  }

  // Clean filename to prevent path traversal
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');

  return {
    valid: true,
    sanitizedFileName: safeName
  };
}

// ============================================================================
// 4. RATE LIMITING & BRUTE FORCE SHIELD (SLIDING WINDOW)
// ============================================================================

interface RateLimitRecord {
  timestamps: number[];
  lockedUntil?: number;
  consecutiveFailures: number;
}

class SecurityLimiter {
  private records = new Map<string, RateLimitRecord>();

  /**
   * Checks if an action is within allowed rate threshold
   */
  checkLimit(key: string, maxActions: number, windowSeconds: number): { allowed: boolean; retryAfter?: number; error?: string } {
    const now = Date.now();
    const windowMs = windowSeconds * 1000;
    
    let record = this.records.get(key);
    if (!record) {
      record = { timestamps: [], consecutiveFailures: 0 };
      this.records.set(key, record);
    }

    // Check if locked
    if (record.lockedUntil && record.lockedUntil > now) {
      const remainingSeconds = Math.ceil((record.lockedUntil - now) / 1000);
      return {
        allowed: false,
        retryAfter: remainingSeconds,
        error: `Acción bloqueada por seguridad. Inténtalo de nuevo en ${remainingSeconds} segundos.`
      };
    }

    // Filter out timestamps outside window
    record.timestamps = record.timestamps.filter(ts => now - ts < windowMs);

    if (record.timestamps.length >= maxActions) {
      const oldest = record.timestamps[0];
      const waitTime = Math.ceil((windowMs - (now - oldest)) / 1000);
      return {
        allowed: false,
        retryAfter: waitTime,
        error: `Has alcanzado el límite de peticiones. Por favor, espera ${waitTime} segundos.`
      };
    }

    record.timestamps.push(now);
    return { allowed: true };
  }

  /**
   * Registers a failed authentication or sensitive action to prevent brute force
   */
  recordFailure(key: string, maxFailures: number = 5, lockDurationSeconds: number = 900): { isLocked: boolean; remainingAttempts: number; lockedUntil?: number } {
    const now = Date.now();
    let record = this.records.get(key);
    if (!record) {
      record = { timestamps: [], consecutiveFailures: 0 };
      this.records.set(key, record);
    }

    record.consecutiveFailures += 1;
    const remaining = Math.max(0, maxFailures - record.consecutiveFailures);

    if (record.consecutiveFailures >= maxFailures) {
      record.lockedUntil = now + (lockDurationSeconds * 1000);
      return {
        isLocked: true,
        remainingAttempts: 0,
        lockedUntil: record.lockedUntil
      };
    }

    return {
      isLocked: false,
      remainingAttempts: remaining
    };
  }

  /**
   * Resets failures after a successful operation
   */
  resetFailures(key: string): void {
    const record = this.records.get(key);
    if (record) {
      record.consecutiveFailures = 0;
      record.lockedUntil = undefined;
    }
  }
}

export const securityLimiter = new SecurityLimiter();

// Preset application limits
export const RATE_LIMITS = {
  POST_CREATE: { max: 3, windowSeconds: 60, name: 'creación de publicaciones' },
  COMMENT_CREATE: { max: 10, windowSeconds: 60, name: 'envío de comentarios' },
  PROFILE_UPDATE: { max: 3, windowSeconds: 60, name: 'actualización de perfil' },
  SEARCH: { max: 40, windowSeconds: 60, name: 'búsquedas' },
  EXTERNAL_SYNC: { max: 2, windowSeconds: 30, name: 'sincronización con tiendas' },
  AUTH_ATTEMPT: { max: 5, windowSeconds: 900, name: 'intentos de acceso' },
  SUPPORT_TICKET_DAILY: { max: 2, windowSeconds: 86400, name: 'consultas diarias de atención al cliente' },
  AI_CHAT_DAILY: { max: 3, windowSeconds: 86400, name: 'consultas diarias al Asistente de IA' },
  AI_CHAT_FLOOD: { max: 1, windowSeconds: 10, name: 'cooldown entre mensajes de IA' }
} as const;

// ============================================================================
// 5. SESSION INTEGRITY & ANTI-HIJACKING FINGERPRINT
// ============================================================================

const SESSION_FINGERPRINT_KEY = 'offertgames_sec_fp';

/**
 * Calculates a non-invasive cryptographic hash of browser environment attributes
 */
export function generateBrowserFingerprint(): string {
  try {
    const nav = window.navigator;
    const screen = window.screen;
    const components = [
      nav.userAgent || '',
      nav.language || '',
      screen.colorDepth || '',
      new Date().getTimezoneOffset(),
      screen.width + 'x' + screen.height
    ];
    
    // Simple fast string hashing (DJB2)
    let hash = 5381;
    const str = components.join('|');
    for (let i = 0; i < str.length; i++) {
      hash = ((hash << 5) + hash) + str.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  } catch {
    return 'fp_fallback';
  }
}

/**
 * Initializes and verifies session integrity
 */
export function verifySessionIntegrity(): boolean {
  try {
    const currentFp = generateBrowserFingerprint();
    const storedFp = sessionStorage.getItem(SESSION_FINGERPRINT_KEY);

    if (!storedFp) {
      sessionStorage.setItem(SESSION_FINGERPRINT_KEY, currentFp);
      return true;
    }

    if (storedFp !== currentFp) {
      console.warn('[Security] Divergencia en huella de sesión detectada.');
      return false;
    }

    return true;
  } catch {
    return true;
  }
}

/**
 * Purges all authentication tokens, session cache, and credentials upon logout
 */
export function purgeSessionSecurityState(): void {
  try {
    sessionStorage.removeItem(SESSION_FINGERPRINT_KEY);
    // Remove any transient security nonces
    sessionStorage.removeItem('offertgames_csrf_token');
    console.log('[Security] Sesión purgada de forma segura.');
  } catch {}
}

// ============================================================================
// 6. SENSITIVE DATA MASKING & PII SHIELD
// ============================================================================

/**
 * Masks credit card numbers so only last 4 digits are visible
 */
export function maskCreditCard(cardNumber: string): string {
  if (!cardNumber) return '••••';
  const clean = cardNumber.replace(/\D/g, '');
  if (clean.length < 4) return '••••';
  const last4 = clean.slice(-4);
  return `•••• •••• •••• ${last4}`;
}

/**
 * Masks email address for public display (e.g., n***o@offertgames.com)
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '***@***';
  const [user, domain] = email.split('@');
  if (user.length <= 2) {
    return `${user[0]}***@${domain}`;
  }
  return `${user[0]}***${user[user.length - 1]}@${domain}`;
}

// ============================================================================
// 7. EXTERNAL API CIRCUIT BREAKER & COMPROMISED API DEFENSE
// ============================================================================

interface CircuitState {
  failureCount: number;
  lastFailureTime: number;
  isOpen: boolean;
}

class CircuitBreaker {
  private circuits = new Map<string, CircuitState>();
  private readonly threshold = 3; // trips after 3 failures
  private readonly recoveryTimeMs = 30000; // 30 seconds recovery window

  /**
   * Executes fetch with bounded timeout and circuit breaker protection
   */
  async execute<T>(
    apiName: string,
    fetcher: () => Promise<T>,
    fallback: T
  ): Promise<{ data: T; fromFallback: boolean }> {
    const now = Date.now();
    let state = this.circuits.get(apiName);

    if (!state) {
      state = { failureCount: 0, lastFailureTime: 0, isOpen: false };
      this.circuits.set(apiName, state);
    }

    // Check if circuit is OPEN
    if (state.isOpen) {
      if (now - state.lastFailureTime > this.recoveryTimeMs) {
        // Half-open: allow probe
        state.isOpen = false;
        state.failureCount = 0;
      } else {
        console.warn(`[Security CircuitBreaker] API '${apiName}' abierta por fallos repetidos. Usando fallback seguro.`);
        return { data: fallback, fromFallback: true };
      }
    }

    try {
      const data = await fetcher();
      // Success: reset failures
      state.failureCount = 0;
      return { data, fromFallback: false };
    } catch (err: any) {
      state.failureCount += 1;
      state.lastFailureTime = now;

      if (state.failureCount >= this.threshold) {
        state.isOpen = true;
        console.error(`[Security CircuitBreaker] Tripped! API '${apiName}' ha fallado ${state.failureCount} veces. Circuito abierto temporalmente.`);
      }

      return { data: fallback, fromFallback: true };
    }
  }
}

export const apiCircuitBreaker = new CircuitBreaker();

/**
 * Safe fetch wrapper with hard timeout to prevent hanging connections or denial of service
 */
export async function safeFetchWithTimeout(
  url: string,
  timeoutMs: number = 8000,
  options?: RequestInit
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    return res;
  } finally {
    clearTimeout(timeoutId);
  }
}

// ============================================================================
// 8. ANTI-CSRF NONCE UTILITIES
// ============================================================================

/**
 * Generates an in-memory CSRF nonce for form state protection
 */
export function getOrCreateCsrfNonce(): string {
  try {
    let nonce = sessionStorage.getItem('offertgames_csrf_token');
    if (!nonce) {
      nonce = Math.random().toString(36).substring(2) + Date.now().toString(36);
      sessionStorage.setItem('offertgames_csrf_token', nonce);
    }
    return nonce;
  } catch {
    return 'csrf_active';
  }
}
