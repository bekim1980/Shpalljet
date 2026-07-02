export type GoogleAuthMode = "supabase" | "nextauth";

/**
 * Google sign-in transport. Default `supabase` keeps the legacy Supabase OAuth flow.
 * Set `VITE_GOOGLE_AUTH_MODE=nextauth` to use Auth.js (Bazaar-style callback on /api/auth/callback/google).
 */
export function getGoogleAuthMode(): GoogleAuthMode {
  const raw = import.meta.env.VITE_GOOGLE_AUTH_MODE?.trim().toLowerCase();
  if (raw === "nextauth") return "nextauth";
  return "supabase";
}

export function isNextAuthGoogleMode(): boolean {
  return getGoogleAuthMode() === "nextauth";
}
