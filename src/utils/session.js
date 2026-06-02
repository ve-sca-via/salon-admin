/**
 * Client-side session helpers (JWT expiry + inactivity).
 * Tokens remain authoritative on the server; these checks align UX across tab sleep/reload.
 */

export const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

const LAST_ACTIVITY_KEY = 'lastActivityAt';
const TOKEN_EXPIRY_KEY = 'tokenExpiry';
const REFRESH_EXPIRY_KEY = 'refreshTokenExpiry';

const AUTH_KEYS = [
  'access_token',
  'refresh_token',
  'user',
  LAST_ACTIVITY_KEY,
  TOKEN_EXPIRY_KEY,
  REFRESH_EXPIRY_KEY,
];

/**
 * Decode JWT payload without verifying signature (client-side expiry hint only).
 */
export function parseJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;
  try {
    const base64 = token.split('.')[1]?.replace(/-/g, '+').replace(/_/g, '/');
    if (!base64) return null;
    const json = atob(base64);
    return JSON.parse(json);
  } catch {
    return null;
  }
}

/** Unix exp (seconds) or null */
export function getJwtExp(token) {
  const payload = parseJwtPayload(token);
  return typeof payload?.exp === 'number' ? payload.exp : null;
}

/** True if token is missing or past exp (optional buffer in seconds). */
export function isJwtExpired(token, bufferSeconds = 30) {
  const exp = getJwtExp(token);
  if (!exp) return true;
  return Date.now() >= exp * 1000 - bufferSeconds * 1000;
}

export function touchActivity() {
  localStorage.setItem(LAST_ACTIVITY_KEY, String(Date.now()));
}

export function isInactivityExpired() {
  const last = localStorage.getItem(LAST_ACTIVITY_KEY);
  if (last) {
    const elapsed = Date.now() - Number(last);
    return Number.isFinite(elapsed) && elapsed > INACTIVITY_TIMEOUT_MS;
  }

  // Sessions saved before lastActivityAt: infer from refresh token issued-at
  const refresh = localStorage.getItem('refresh_token');
  const iat = parseJwtPayload(refresh)?.iat;
  if (typeof iat === 'number') {
    return Date.now() - iat * 1000 > INACTIVITY_TIMEOUT_MS;
  }

  return false;
}

export function syncTokenExpiryFromJwt(accessToken, refreshToken) {
  const accessExp = getJwtExp(accessToken);
  const refreshExp = getJwtExp(refreshToken);
  if (accessExp) {
    localStorage.setItem(TOKEN_EXPIRY_KEY, new Date(accessExp * 1000).toISOString());
  }
  if (refreshExp) {
    localStorage.setItem(REFRESH_EXPIRY_KEY, new Date(refreshExp * 1000).toISOString());
  }
}

export function clearAuthStorage() {
  AUTH_KEYS.forEach((key) => localStorage.removeItem(key));
}

export function hasStoredAuth() {
  return Boolean(
    localStorage.getItem('access_token') || localStorage.getItem('refresh_token')
  );
}
