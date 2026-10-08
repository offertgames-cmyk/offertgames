import type { User as FirebaseUser } from 'firebase/auth';

const SESSION_KEY = 'offertgames_google_email_otp_session';

type VerifiedSession = {
  uid: string;
  email: string;
  authTime: string;
  verifiedAt: number;
};

export function markGoogleEmailVerifiedSession(session: Omit<VerifiedSession, 'verifiedAt'>): void {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({ ...session, verifiedAt: Date.now() }));
  } catch {
    throw new Error('El navegador no permite guardar la verificación de esta sesión.');
  }
}

export function clearGoogleEmailVerifiedSession(): void {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {}
}

export function hasGoogleEmailVerificationMarker(uid: string, email: string): boolean {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const marker = JSON.parse(raw) as VerifiedSession;
    return marker.uid === uid &&
      marker.email.toLowerCase() === email.toLowerCase() &&
      typeof marker.authTime === 'string' &&
      Number.isFinite(marker.verifiedAt) &&
      Date.now() - marker.verifiedAt < 12 * 60 * 60 * 1000;
  } catch {
    return false;
  }
}

export async function hasGoogleEmailVerifiedSession(user: FirebaseUser): Promise<boolean> {
  try {
    if (!hasGoogleEmailVerificationMarker(user.uid, user.email || '') || user.emailVerified !== true) {
      return false;
    }
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (!raw) return false;
    const marker = JSON.parse(raw) as VerifiedSession;
    if (
      marker.uid !== user.uid ||
      marker.email.toLowerCase() !== (user.email || '').toLowerCase() ||
      user.emailVerified !== true
    ) {
      return false;
    }
    const tokenResult = await user.getIdTokenResult();
    return String(tokenResult.claims.auth_time || '') === marker.authTime;
  } catch {
    return false;
  }
}
