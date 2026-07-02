import { signIn } from "next-auth/react";
import { getGoogleAuthCallbackUrl } from "@/lib/siteUrl";

type NextAuthGoogleResult = {
  redirected?: boolean;
  error?: Error;
};

/**
 * Bazaar-style Google sign-in: Auth.js handles OAuth; callback is /api/auth/callback/google.
 * Supabase session is established on /auth/google-callback via signInWithIdToken.
 */
export async function signInWithGoogleNextAuth(): Promise<NextAuthGoogleResult> {
  try {
    const result = await signIn("google", {
      callbackUrl: getGoogleAuthCallbackUrl(),
      redirect: true,
    });

    if (result?.error) {
      return { error: new Error(result.error) };
    }

    return { redirected: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not start Google sign-in.";
    return { error: new Error(message) };
  }
}
