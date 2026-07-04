import { signIn } from "next-auth/react";
import { getGoogleAuthCallbackUrl } from "@/lib/siteUrl";

type NextAuthGoogleResult = {
  redirected?: boolean;
  error?: Error;
};

/**
 * Start Google OAuth via Auth.js.
 *
 * NextAuth v4 expects OAuth start on POST /api/auth/signin/:provider via
 * next-auth/react's signIn(). If that request fails or auth is unavailable,
 * return the user to the app login UI instead of the PWA install page.
 */
export async function signInWithGoogleNextAuth(): Promise<NextAuthGoogleResult> {
  try {
    const result = await signIn("google", {
      callbackUrl: getGoogleAuthCallbackUrl(),
      redirect: true,
    });

    if (result?.error) {
      window.location.assign("/login?authError=google_start_failed");
      return { redirected: true };
    }

    return { redirected: true };
  } catch (err) {
    window.location.assign("/login?authError=google_start_failed");
    const message = err instanceof Error ? err.message : "Could not start Google sign-in.";
    return { error: new Error(message) };
  }
}
