import { getGoogleAuthCallbackUrl } from "@/lib/siteUrl";

type NextAuthGoogleResult = {
  redirected?: boolean;
  error?: Error;
};

async function fetchNextAuthCsrfToken(): Promise<string> {
  const response = await fetch("/api/auth/csrf", { credentials: "same-origin" });
  if (!response.ok) {
    throw new Error("Could not fetch auth CSRF token.");
  }
  const data = (await response.json()) as { csrfToken?: string };
  if (!data.csrfToken) {
    throw new Error("Auth CSRF token missing.");
  }
  return data.csrfToken;
}

/**
 * NextAuth v4 starts OAuth on POST /api/auth/signin/:provider with a CSRF token.
 * A full-page form POST works on Android WebView/TWA; fetch+json POST from
 * next-auth/react does not. GET sign-in redirects to pages.signIn (/login) instead
 * of Google when a custom sign-in page is configured.
 */
function submitNextAuthSignInForm(provider: string, callbackUrl: string, csrfToken: string): void {
  const form = document.createElement("form");
  form.method = "POST";
  form.action = `/api/auth/signin/${provider}`;

  const csrfInput = document.createElement("input");
  csrfInput.type = "hidden";
  csrfInput.name = "csrfToken";
  csrfInput.value = csrfToken;
  form.appendChild(csrfInput);

  const callbackInput = document.createElement("input");
  callbackInput.type = "hidden";
  callbackInput.name = "callbackUrl";
  callbackInput.value = callbackUrl;
  form.appendChild(callbackInput);

  document.body.appendChild(form);
  form.submit();
}

/**
 * Start Google OAuth via Auth.js using a mobile-safe form POST.
 */
export async function signInWithGoogleNextAuth(): Promise<NextAuthGoogleResult> {
  try {
    const callbackUrl = getGoogleAuthCallbackUrl();
    const csrfToken = await fetchNextAuthCsrfToken();

    console.info("[oauth] nextauth POST navigation", {
      pathname: "/api/auth/signin/google",
      hasCallback: true,
    });

    submitNextAuthSignInForm("google", callbackUrl, csrfToken);
    return { redirected: true };
  } catch (err) {
    console.warn("[oauth] google start failed", err instanceof Error ? err.message : "unknown");
    window.location.assign("/login?authError=google_start_failed");
    const message = err instanceof Error ? err.message : "Could not start Google sign-in.";
    return { error: new Error(message) };
  }
}
