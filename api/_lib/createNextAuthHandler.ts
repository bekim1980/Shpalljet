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
  if (existing !== undefined && existing !== null && existing !== "") return;

  const pathname = (req.url ?? "").split("?")[0];
  const match = pathname.match(/\/api\/auth\/?(.*)$/);
  const segments = match?.[1]?.split("/").filter(Boolean) ?? [];

  if (segments.length > 0) {
    req.query.nextauth = segments;
  }
}

export function createNextAuthHandler() {
  ensureNextAuthUrl();
  const nextAuth = NextAuth(authOptions);

  return function nextAuthHandler(req: VercelRequest, res: VercelResponse) {
    normalizeNextAuthQuery(req);
    return nextAuth(req, res);
  };
}
