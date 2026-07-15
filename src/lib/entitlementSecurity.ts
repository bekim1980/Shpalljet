/**
 * Security: entitlement fields must never be sent from the browser.
 * Premium, Boost, counters, and paid renewals are granted only server-side
 * (DB triggers + grant_listing_entitlement RPC after payment verification).
 */

/** Fields that only service_role / payment webhooks may write. */
export const CLIENT_BLOCKED_PRODUCT_FIELDS = [
  "listing_type",
  "is_boosted",
  "boost_expires_at",
  "auto_renew",
  "views_count",
  "messages_count",
  "favorites_count",
  "quality_score",
] as const;

export type ClientBlockedProductField = (typeof CLIENT_BLOCKED_PRODUCT_FIELDS)[number];

/** Strip entitlement fields before any client-side products.update(). */
export function stripClientEntitlementFields<T extends Record<string, unknown>>(
  updates: T,
): Omit<T, ClientBlockedProductField> {
  const safe = { ...updates };
  for (const key of CLIENT_BLOCKED_PRODUCT_FIELDS) {
    delete safe[key];
  }
  return safe;
}

/** Free-tier renewals may only extend expires_at; paid tier changes are blocked server-side. */
export function buildFreeRenewalUpdates(expiresAt: string): {
  status: string;
  expires_at: string;
} {
  return { status: "active", expires_at: expiresAt };
}
