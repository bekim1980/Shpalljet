/**
 * Display-only catalog labels for checkout UI.
 * Prices match public.entitlement_catalog; server validates amounts at checkout.
 */

export type EntitlementTypeId =
  | "premium"
  | "premium_renew"
  | "boost_1"
  | "boost_3"
  | "boost_7"
  | "auto_renew_on";

export const ENTITLEMENT_TYPE_IDS: EntitlementTypeId[] = [
  "premium",
  "premium_renew",
  "boost_1",
  "boost_3",
  "boost_7",
  "auto_renew_on",
];

export function isEntitlementTypeId(value: string): value is EntitlementTypeId {
  return (ENTITLEMENT_TYPE_IDS as string[]).includes(value);
}

/** Display prices only — never sent to checkout API. */
export const CATALOG_DISPLAY: Record<
  EntitlementTypeId,
  { label: string; priceLabel: string; durationLabel: string }
> = {
  premium: { label: "Premium listing", priceLabel: "€9.99", durationLabel: "30 days" },
  premium_renew: { label: "Premium renewal", priceLabel: "€9.99", durationLabel: "30 days" },
  boost_1: { label: "24 hours", priceLabel: "€2", durationLabel: "24 hours" },
  boost_3: { label: "3 days", priceLabel: "€5", durationLabel: "3 days" },
  boost_7: { label: "7 days", priceLabel: "€10", durationLabel: "7 days" },
  auto_renew_on: { label: "Auto-renew", priceLabel: "€9.99", durationLabel: "per renewal" },
};
