export type OAuthProvider = "google" | "apple";

const ENV_KEYS: Record<OAuthProvider, string> = {
  google: "VITE_OAUTH_GOOGLE_ENABLED",
  apple: "VITE_OAUTH_APPLE_ENABLED",
};

const FACEBOOK_ENV_KEY = "VITE_OAUTH_FACEBOOK_ENABLED";

/** Set true when Auth.js Facebook bridge is shipped. */
export const FACEBOOK_AUTH_IMPLEMENTED = false;

function readEnvFlag(key: string, defaultValue: boolean): boolean {
  const raw = import.meta.env[key];
  if (raw === undefined || raw === "") return defaultValue;
  return raw === "true" || raw === "1" || raw === "yes";
}

/**
 * OAuth buttons are hidden unless explicitly enabled.
 * Set to true in Vercel only after the provider is fully configured in Supabase.
 */
export function isOAuthProviderEnabled(provider: OAuthProvider): boolean {
  return readEnvFlag(ENV_KEYS[provider], false);
}

export function isFacebookOAuthUiEnabled(): boolean {
  return readEnvFlag(FACEBOOK_ENV_KEY, false);
}

export function isFacebookButtonVisible(): boolean {
  return isFacebookOAuthUiEnabled() && FACEBOOK_AUTH_IMPLEMENTED;
}

export function enabledOAuthProviders(): OAuthProvider[] {
  return (["google", "apple"] as const).filter(isOAuthProviderEnabled);
}

export const hasAnyOAuthProvider = (): boolean => enabledOAuthProviders().length > 0;

/** Social buttons rendered in the premium auth shell (Google + future Facebook). */
export function hasVisibleSocialProviders(): boolean {
  return isOAuthProviderEnabled("google") || isFacebookButtonVisible();
}
