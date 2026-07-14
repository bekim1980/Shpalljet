/**
 * Server-controlled entitlement catalog (mirrors public.entitlement_catalog).
 * Prices and durations are never accepted from the client.
 */

export type EntitlementType =
  | "premium"
  | "premium_renew"
  | "boost_1"
  | "boost_3"
  | "boost_7"
  | "auto_renew_on";

export interface CatalogEntry {
  entitlementType: EntitlementType;
  amountCents: number;
  currency: "eur";
  durationDays: number | null;
}

export const ENTITLEMENT_CATALOG: Record<EntitlementType, CatalogEntry> = {
  premium: { entitlementType: "premium", amountCents: 999, currency: "eur", durationDays: 30 },
  premium_renew: { entitlementType: "premium_renew", amountCents: 999, currency: "eur", durationDays: 30 },
  boost_1: { entitlementType: "boost_1", amountCents: 200, currency: "eur", durationDays: 1 },
  boost_3: { entitlementType: "boost_3", amountCents: 500, currency: "eur", durationDays: 3 },
  boost_7: { entitlementType: "boost_7", amountCents: 1000, currency: "eur", durationDays: 7 },
  auto_renew_on: { entitlementType: "auto_renew_on", amountCents: 999, currency: "eur", durationDays: null },
};

export const BOOST_ENTITLEMENT_TYPES = ["boost_1", "boost_3", "boost_7"] as const;

export function resolveEntitlementType(input: {
  kind: "premium" | "premium_renew" | "boost" | "auto_renew_on";
  boostDays?: 1 | 3 | 7;
}): EntitlementType {
  if (input.kind === "boost") {
    const days = input.boostDays ?? 3;
    if (days === 1) return "boost_1";
    if (days === 7) return "boost_7";
    return "boost_3";
  }
  return input.kind;
}

export function getCatalogEntry(type: EntitlementType): CatalogEntry {
  const entry = ENTITLEMENT_CATALOG[type];
  if (!entry) throw new Error(`Unknown entitlement type: ${type}`);
  return entry;
}

export function isSupportedStripeEvent(type: string): boolean {
  return [
    "checkout.session.completed",
    "checkout.session.expired",
    "charge.refunded",
    "charge.dispute.created",
    "payment_intent.payment_failed",
  ].includes(type);
}
