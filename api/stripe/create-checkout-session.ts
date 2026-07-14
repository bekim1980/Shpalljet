import type { VercelRequest, VercelResponse } from "@vercel/node";
import {
  getCatalogEntry,
  resolveEntitlementType,
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

export default async function handler(req: VercelRequest, res: VercelResponse) {
  Object.entries(cors).forEach(([k, v]) => res.setHeader(k, v));

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  try {
    const user = await getUserFromBearerToken(req.headers.authorization);
    if (!user) return res.status(401).json({ error: "Unauthorized" });

    const body = parseBody(req);
    const productId = String(body.productId ?? "");
    const kind = String(body.kind ?? "") as "premium" | "premium_renew" | "boost" | "auto_renew_on";
    const boostDays = body.boostDays as 1 | 3 | 7 | undefined;

    if (!productId) return res.status(400).json({ error: "productId is required" });

    const allowedKinds = ["premium", "premium_renew", "boost", "auto_renew_on"];
    if (!allowedKinds.includes(kind)) {
      return res.status(400).json({ error: "Invalid entitlement kind" });
    }

    // Security: derive type/price/duration from server catalog — ignore client price fields.
    const entitlementType: EntitlementType = resolveEntitlementType({ kind, boostDays });
    getCatalogEntry(entitlementType);

    const origin = req.headers.origin ?? process.env.SITE_URL ?? "http://localhost:8080";
    const successUrl = `${origin}/profile?checkout=success`;
    const cancelUrl = `${origin}/profile?checkout=cancelled`;

    const session = await createListingCheckoutSession({
      userId: user.id,
      productId,
      entitlementType,
      successUrl,
      cancelUrl,
    });

    return res.status(200).json({
      sessionId: session.sessionId,
      url: session.url,
      paymentId: session.paymentId,
      entitlementType,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Checkout failed";
    if (msg.includes("Forbidden")) return res.status(403).json({ error: msg });
    if (msg.includes("not found")) return res.status(404).json({ error: msg });
    console.error("[stripe-checkout]", msg);
    return res.status(500).json({ error: "Failed to create checkout session" });
  }
}
