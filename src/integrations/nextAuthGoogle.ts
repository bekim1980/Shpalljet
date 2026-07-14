import { getGoogleAuthCallbackUrl } from "@/lib/siteUrl";

type NextAuthGoogleResult = {
  redirected?: boolean;
  error?: Error;
};

/**
 * Start Google OAuth via Auth.js.
 *
 * Use a full-page GET to /api/auth/signin/google. next-auth/react signIn() POSTs with
 * json:true — on Android WebView/TWA that can fail or fall back to GET /api/auth/signin,
 * which our API wrapper previously redirected as "browser auth page redirect".
 */
export async function signInWithGoogleNextAuth(): Promise<NextAuthGoogleResult> {
  try {
    const callbackUrl = getGoogleAuthCallbackUrl();
    const params = new URLSearchParams({ callbackUrl });
    const target = `/api/auth/signin/google?${params}`;

    console.info("[oauth] google start", { transport: "GET" });

    window.location.assign(target);
    return { redirected: true };
  } catch (err) {
    console.warn("[oauth] google start failed", err instanceof Error ? err.message : "unknown");
    window.location.assign("/login?authError=google_start_failed");
    const message = err instanceof Error ? err.message : "Could not start Google sign-in.";
    return { error: new Error(message) };
  }
}
