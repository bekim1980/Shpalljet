import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  PAYMENTS_DISABLED_MESSAGE,
  PAYMENTS_ENABLED,
} from "../../src/config/features.js";
import {
  ENTITLEMENT_CATALOG,
  getCatalogEntry,
  type EntitlementType,
} from "../_lib/entitlementCatalog.js";
import { createListingCheckoutSession } from "../_lib/stripeEntitlements.js";
import { getUserFromBearerToken } from "../_lib/supabaseService.js";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

function parseBody(req: VercelRequest): Record<string, unknown> {
  if (!req.body) return {};
  return typeof req.body === "string" ? JSON.parse(req.body) : (req.body as Record<string, unknown>);
}

function isEntitlementType(value: string): value is EntitlementType {
  return Object.prototype.hasOwnProperty.call(ENTITLEMENT_CATALOG, value);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  if (!PAYMENTS_ENABLED) {
    return res.status(503).json({ error: PAYMENTS_DISABLED_MESSAGE });
  }

  if (!process.env.STRIPE_SECRET_KEY) {
    return res.status(503).json({ error: "STRIPE_SECRET_KEY is not configured" });
  }
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    return res.status(503).json({ error: "SUPABASE_SERVICE_ROLE_KEY is not configured" });
  }

  try {
    const user = await getUserFromBearerToken(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const body = parseBody(req);
    const productId = String(body.productId ?? "").trim();
    const entitlementTypeRaw = String(body.entitlementType ?? "").trim();

    if (!productId) return res.status(400).json({ error: "productId is required" });
    if (!entitlementTypeRaw || !isEntitlementType(entitlementTypeRaw)) {
      return res.status(400).json({ error: "Invalid entitlementType" });
    }

    const entitlementType: EntitlementType = entitlementTypeRaw;
    getCatalogEntry(entitlementType);

    const origin = req.headers.origin ?? process.env.SITE_URL ?? "http://localhost:8080";
    const encodedEntitlement = encodeURIComponent(entitlementType);
    const successUrl = `${origin}/product/${productId}?checkout=success&entitlement=${encodedEntitlement}`;
    const cancelUrl = `${origin}/product/${productId}?checkout=cancelled&entitlement=${encodedEntitlement}`;

    const session = await createListingCheckoutSession({
      userId: user.id,
      productId,
      entitlementType,
      successUrl,
      cancelUrl,
    });

    if (!session.url) {
      return res.status(500).json({ error: "Stripe did not return a checkout URL" });
    }

    return res.status(200).json({
      sessionId: session.sessionId,
      url: session.url,
      paymentId: session.paymentId,
      entitlementType,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Checkout failed";
    if (msg.includes("Forbidden")) return res.status(403).json({ error: msg });
    if (msg.includes("not found") || msg.includes("Listing not found")) {
      return res.status(404).json({ error: msg });
    }
    if (msg.includes("STRIPE_SECRET_KEY")) {
      return res.status(503).json({ error: msg });
    }
    console.error("[stripe-checkout]", msg);
    return res.status(500).json({ error: "Failed to create checkout session" });
  }
}
