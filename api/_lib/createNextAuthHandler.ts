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

type AuthEnvSnapshot = {
  GOOGLE_CLIENT_ID: boolean;
  GOOGLE_CLIENT_SECRET: boolean;
  AUTH_SECRET: boolean;
  NEXTAUTH_SECRET: boolean;
  AUTH_URL: string | null;
  NEXTAUTH_URL: string | null;
  VERCEL_URL: string | null;
  VERCEL_ENV: string | null;
  NODE_ENV: string | null;
  nodeRuntime: string | null;
  nodeVersion: string | null;
};

function getAuthEnvSnapshot(): AuthEnvSnapshot {
  return {
    GOOGLE_CLIENT_ID: !!process.env.GOOGLE_CLIENT_ID,
    GOOGLE_CLIENT_SECRET: !!process.env.GOOGLE_CLIENT_SECRET,
    AUTH_SECRET: !!process.env.AUTH_SECRET,
    NEXTAUTH_SECRET: !!process.env.NEXTAUTH_SECRET,
    AUTH_URL: process.env.AUTH_URL ?? null,
    NEXTAUTH_URL: process.env.NEXTAUTH_URL ?? null,
    VERCEL_URL: process.env.VERCEL_URL ?? null,
    VERCEL_ENV: process.env.VERCEL_ENV ?? null,
    NODE_ENV: process.env.NODE_ENV ?? null,
    nodeRuntime: process.release?.name ?? null,
    nodeVersion: process.versions?.node ?? null,
  };
}

function jsonLoginFallback(res: VercelResponse, reason: string, envSnapshot: AuthEnvSnapshot) {
  res.statusCode = 200;
  res.setHeader("Content-Type", "application/json");
  res.end(
    JSON.stringify({
      url: `/login?authError=${encodeURIComponent(reason)}`,
      error: reason,
      env: envSnapshot,
    }),
  );
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
    const envSnapshot = getAuthEnvSnapshot();
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
        env: envSnapshot,
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
        env: envSnapshot,
      });

      if (req.method === "POST" && action === "signin" && providerId === "google") {
        return jsonLoginFallback(res, "missing_google_auth_config", envSnapshot);
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

    // Browser GET /api/auth/signin/:provider is allowed through for diagnostics only.
    // OAuth must start via POST (see nextAuthGoogle.ts form submit).

    if (isBrowserNavigationMethod && action === "signin" && !providerId) {
      const qs = new URLSearchParams();
      if (callbackUrl) qs.set("callbackUrl", callbackUrl);
      if (explicitNext) qs.set("next", explicitNext);
      if (authError) qs.set("error", authError);
      const loginTarget = qs.toString() ? `/login?${qs}` : "/login";
      console.info("[auth] signin page redirect", {
        reason: "signin_without_provider",
        hasCallbackUrl: !!callbackUrl,
        hasNext: !!nextParam,
      });
      res.statusCode = 307;
      res.setHeader("Location", loginTarget);
      res.end();
      return;
    }

    if (isBrowserNavigationMethod && action && !["providers", "session", "csrf", "callback", "verify-request", "signin", "signout", "error"].includes(action)) {
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
