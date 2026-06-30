import { supabase } from "./supabase/client";
import { isOAuthProviderEnabled } from "@/config/authProviders";
import { getAuthCallbackUrl } from "@/lib/siteUrl";

type SignInOptions = {
  redirect_uri?: string;
  extraParams?: Record<string, string>;
};

type OAuthResult = {
  redirected?: boolean;
  error?: Error;
};

export const oauthAuth = {
  signInWithOAuth: async (
    provider: "google" | "apple",
    opts?: SignInOptions,
  ): Promise<OAuthResult> => {
    if (!isOAuthProviderEnabled(provider)) {
      return {
        error: new Error(
          `${provider === "google" ? "Google" : "Apple"} sign-in is not enabled yet.`,
        ),
      };
    }

    const redirectTo = opts?.redirect_uri ?? getAuthCallbackUrl();

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo,
        queryParams: opts?.extraParams,
      },
    });

    if (error) {
      return { error: new Error(error.message) };
    }

    if (data?.url) {
      window.location.href = data.url;
      return { redirected: true };
    }

    return {};
  },
};
