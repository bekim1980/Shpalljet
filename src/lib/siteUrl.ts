/** Canonical public site URL (no trailing slash). */
const DEFAULT_SITE_URL = "https://www.shpalljet.net";

export function getSiteUrl(): string {
  const fromEnv = import.meta.env.VITE_SITE_URL?.trim().replace(/\/$/, "");
  if (fromEnv) return fromEnv;
  if (typeof window !== "undefined") return window.location.origin;
  return DEFAULT_SITE_URL;
}

/** OAuth / email confirmation redirect target (must be allowlisted in Supabase). */
export function getAuthCallbackUrl(): string {
  return `${getSiteUrl()}/auth/callback`;
}

/** Post–Auth.js Google bridge page (after /api/auth/callback/google). */
export function getGoogleAuthCallbackUrl(): string {
  return `${getSiteUrl()}/auth/google-callback`;
}
