import { createRequire } from "node:module";
import type { VercelRequest, VercelResponse } from "@vercel/node";
import { authOptions, ensureNextAuthUrl } from "./authOptions.js";

const require = createRequire(import.meta.url);

/** next-auth is CJS; ESM default import is an object under package "type": "module". */
const NextAuth = require("next-auth").default as typeof import("next-auth").default;

/**
 * NextAuth v4 expects `req.query.nextauth` from a catch-all route (e.g. providers → ["providers"]).
 * Vercel may invoke the handler without populating that query key; derive it from the URL path.
 */
export function normalizeNextAuthQuery(req: VercelRequest): void {
  const existing = req.query.nextauth;
  if (Array.isArray(existing)) {
    req.query.nextauth = existing.filter(Boolean).map(String);
    return;
  }
  if (typeof existing === "string" && existing) {
    req.query.nextauth = existing.split("/").filter(Boolean);
    return;
  }

  const pathname = (req.url ?? "").split("?")[0];
  const match = pathname.match(/\/api\/auth\/?(.*)$/);
  const segments = match?.[1]?.split("/").filter(Boolean) ?? [];

  if (segments.length > 0) {
    req.query.nextauth = segments;
  }
}

function getNextAuthSegments(req: VercelRequest): string[] {
  const existing = req.query.nextauth;
  if (Array.isArray(existing)) return existing.filter(Boolean).map(String);
  if (typeof existing === "string" && existing) {
    return existing.split("/").filter(Boolean).map(String);
  }

  const pathname = (req.url ?? "").split("?")[0];
  const match = pathname.match(/\/api\/auth\/?(.*)$/);
  return match?.[1]?.split("/").filter(Boolean) ?? [];
}

function redirectToLogin(res: VercelResponse, reason: string, statusCode = 307) {
  const location = `/login?authError=${encodeURIComponent(reason)}`;
  res.statusCode = statusCode;
  res.setHeader("Location", location);
  res.end();
}

function jsonLoginFallback(res: VercelResponse, reason: string) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(JSON.stringify({ url: `/login?authError=${encodeURIComponent(reason)}`, error: reason }));
}

function getFatalAuthConfig() {
  const missing: string[] = [];
  if (!(process.env.AUTH_SECRET ?? process.env.NEXTAUTH_SECRET)) {
    missing.push("AUTH_SECRET or NEXTAUTH_SECRET");
  }
  if (!process.env.GOOGLE_CLIENT_ID) {
    missing.push("GOOGLE_CLIENT_ID");
  }
  if (!process.env.GOOGLE_CLIENT_SECRET) {
    missing.push("GOOGLE_CLIENT_SECRET");
  }
  return missing;
}

function getAuthConfigWarnings() {
  const missing: string[] = [];
  if (!(process.env.AUTH_URL ?? process.env.NEXTAUTH_URL ?? process.env.VERCEL_URL)) {
    missing.push("AUTH_URL, NEXTAUTH_URL, or VERCEL_URL");
  }
  return missing;
}

function getQueryStringValue(value: string | string[] | undefined): string | undefined {
  if (Array.isArray(value)) return value[0];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function getNextParam(callbackUrl?: string, explicitNext?: string) {
  if (explicitNext) return explicitNext;
  if (!callbackUrl) return undefined;
  try {
    return new URL(callbackUrl).searchParams.get("next") ?? undefined;
  } catch {
    return undefined;
  }
}

export function createNextAuthHandler() {
  ensureNextAuthUrl();
  const nextAuth = NextAuth(authOptions);

  return function nextAuthHandler(req: VercelRequest, res: VercelResponse) {
    normalizeNextAuthQuery(req);
    const segments = getNextAuthSegments(req);
    const action = segments[0];
    const providerId = segments[1];
    const isBrowserNavigationMethod = req.method === "GET" || req.method === "HEAD";
    const missingConfig = getFatalAuthConfig();
    const configWarnings = getAuthConfigWarnings();
    const callbackUrl = getQueryStringValue(req.query.callbackUrl);
    const explicitNext = getQueryStringValue(req.query.next);
    const nextParam = getNextParam(callbackUrl, explicitNext);
    const authError = getQueryStringValue(req.query.error);

    if (action === "signin" || action === "callback" || action === "error") {
      console.info("[auth] request", {
        action,
        providerId,
        method: req.method,
        callbackUrl,
        next: nextParam,
        error: authError,
        host: req.headers.host,
        url: req.url,
      });
    }

    if (configWarnings.length > 0) {
      console.warn("[auth] Missing recommended auth configuration", {
        action,
        providerId,
        method: req.method,
        host: req.headers.host,
        url: req.url,
        configWarnings,
      });
    }

    if (missingConfig.length > 0) {
      console.error("[auth] Missing production auth configuration", {
        action,
        providerId,
        method: req.method,
        callbackUrl,
        next: nextParam,
        error: authError,
        host: req.headers.host,
        url: req.url,
        missingConfig,
      });

      if (req.method === "POST" && action === "signin" && providerId === "google") {
        return jsonLoginFallback(res, "missing_google_auth_config");
      }
      if (isBrowserNavigationMethod && ["signin", "signout", "error", "callback"].includes(action ?? "")) {
        console.warn("[auth] redirect fallback", {
          reason: "missing_google_auth_config",
          finalRedirectTarget: "/login",
          action,
          providerId,
          callbackUrl,
          next: nextParam,
        });
        return redirectToLogin(res, "missing_google_auth_config");
      }
    }

    // Raw browser GETs to provider-specific sign-in URLs are not the supported NextAuth
    // v4 entrypoint here; send users to the app login page instead of a dead-end route.
    if (isBrowserNavigationMethod && action === "signin" && providerId) {
      console.warn("[auth] redirect fallback", {
        reason: "provider_get_not_supported",
        finalRedirectTarget: "/login",
        action,
        providerId,
        callbackUrl,
        next: nextParam,
      });
      return redirectToLogin(res, "provider_get_not_supported");
    }

    if (isBrowserNavigationMethod && (action === "signin" || action === "signout" || action === "error")) {
      console.warn("[auth] redirect fallback", {
        reason: "browser_auth_page_redirect",
        finalRedirectTarget: "/login",
        action,
        providerId,
        callbackUrl,
        next: nextParam,
        error: authError,
      });
      return redirectToLogin(res, "browser_auth_page_redirect");
    }

    if (isBrowserNavigationMethod && action && !["providers", "session", "csrf", "callback", "verify-request"].includes(action)) {
      console.warn("[auth] redirect fallback", {
        reason: "unsupported_auth_route",
        finalRedirectTarget: "/login",
        action,
        providerId,
        callbackUrl,
        next: nextParam,
      });
      return redirectToLogin(res, "unsupported_auth_route");
    }

    return nextAuth(req, res);
  };
}
