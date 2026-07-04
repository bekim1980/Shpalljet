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
 * send the user to /install instead of exposing raw auth errors or 404s.
 */
export async function signInWithGoogleNextAuth(): Promise<NextAuthGoogleResult> {
  try {
    const result = await signIn("google", {
      callbackUrl: getGoogleAuthCallbackUrl(),
      redirect: true,
    });

    if (result?.error) {
      window.location.assign("/install");
      return { redirected: true };
    }

    return { redirected: true };
  } catch (err) {
    window.location.assign("/install");
    const message = err instanceof Error ? err.message : "Could not start Google sign-in.";
    return { error: new Error(message) };
  }
}
