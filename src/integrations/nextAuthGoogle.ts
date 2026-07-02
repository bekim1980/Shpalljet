import { getGoogleAuthCallbackUrl } from "@/lib/siteUrl";

type NextAuthGoogleResult = {
  redirected?: boolean;
  error?: Error;
};

/**
 * Start Google OAuth via Auth.js.
 *
 * We use a full-page GET to /api/auth/signin/google instead of signIn() from
 * next-auth/react, because signIn() POSTs with json:true and parses JSON — if the
 * API returns HTML (SPA fallback, custom sign-in page, etc.) the client throws
 * "Unexpected token … is not valid JSON".
 */
export async function signInWithGoogleNextAuth(): Promise<NextAuthGoogleResult> {
  try {
    const callbackUrl = getGoogleAuthCallbackUrl();
    const params = new URLSearchParams({ callbackUrl });
    window.location.assign(`/api/auth/signin/google?${params}`);
    return { redirected: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not start Google sign-in.";
    return { error: new Error(message) };
  }
}
