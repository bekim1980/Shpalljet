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

function redirectToInstall(res: VercelResponse, statusCode = 307) {
  res.statusCode = statusCode;
  res.setHeader("Location", "/install");
  res.end();
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

    // Raw browser GETs to provider-specific sign-in URLs are not the supported NextAuth
    // v4 entrypoint here; they can 404 on Vercel. Keep users on the polished install page.
    if (isBrowserNavigationMethod && action === "signin" && providerId) {
      return redirectToInstall(res);
    }

    if (isBrowserNavigationMethod && (action === "signin" || action === "signout" || action === "error")) {
      return redirectToInstall(res);
    }

    if (isBrowserNavigationMethod && action && !["providers", "session", "csrf", "callback", "verify-request"].includes(action)) {
      return redirectToInstall(res);
    }

    return nextAuth(req, res);
  };
}
