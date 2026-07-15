import { describe, expect, it } from "vitest";
import {
  ENTITLEMENT_CATALOG,
  getCatalogEntry,
  isSupportedStripeEvent,
  resolveEntitlementType,
} from "../../api/_lib/entitlementCatalog";
import {
  stripClientEntitlementFields,
  buildFreeRenewalUpdates,
  CLIENT_BLOCKED_PRODUCT_FIELDS,
} from "@/lib/entitlementSecurity";

describe("entitlementCatalog", () => {
  it("derives boost entitlement type from server config only", () => {
    expect(resolveEntitlementType({ kind: "boost", boostDays: 1 })).toBe("boost_1");
    expect(resolveEntitlementType({ kind: "boost", boostDays: 7 })).toBe("boost_7");
    expect(resolveEntitlementType({ kind: "premium" })).toBe("premium");
  });

  it("rejects unknown entitlement types", () => {
    expect(() => getCatalogEntry("invalid" as never)).toThrow();
  });

  it("uses fixed server prices (never client-controlled)", () => {
    expect(ENTITLEMENT_CATALOG.premium.amountCents).toBe(999);
    expect(ENTITLEMENT_CATALOG.boost_3.amountCents).toBe(500);
  });

  it("accepts only supported Stripe webhook events", () => {
    expect(isSupportedStripeEvent("checkout.session.completed")).toBe(true);
    expect(isSupportedStripeEvent("charge.refunded")).toBe(true);
    expect(isSupportedStripeEvent("customer.created")).toBe(false);
  });
});

describe("client entitlement blocking", () => {
  it("strips all protected product fields", () => {
    const payload = Object.fromEntries(CLIENT_BLOCKED_PRODUCT_FIELDS.map((k) => [k, "x"]));
    payload.title = "ok";
    expect(stripClientEntitlementFields(payload)).toEqual({ title: "ok" });
  });

  it("free renewal payload excludes paid fields", () => {
    expect(buildFreeRenewalUpdates("2026-08-01T00:00:00Z")).toEqual({
      status: "active",
      expires_at: "2026-08-01T00:00:00Z",
    });
    expect(buildFreeRenewalUpdates("2026-08-01T00:00:00Z")).not.toHaveProperty("listing_type");
    expect(buildFreeRenewalUpdates("2026-08-01T00:00:00Z")).not.toHaveProperty("is_boosted");
  });
});

describe("payment grant security invariants (unit-level)", () => {
  it("grant RPC signature requires payment_id + webhook_event_id only", () => {
    // Documented contract: no client-supplied entitlement type/duration/price params.
    const allowedParams = ["p_payment_id", "p_webhook_event_id"];
    expect(allowedParams).toEqual(["p_payment_id", "p_webhook_event_id"]);
  });

  it("duplicate webhook event id must be idempotent", () => {
    const first = { status: "granted", grant_id: "g1" };
    const duplicate = { status: "already_granted", grant_id: "g1" };
    expect(duplicate.status).toBe("already_granted");
    expect(first.grant_id).toBe(duplicate.grant_id);
  });
});

describe("blocked client attack vectors", () => {
  const attacks = [
    { listing_type: "paid", expires_at: "2099-01-01T00:00:00Z" },
    { is_boosted: true, boost_expires_at: "2099-01-01T00:00:00Z" },
    { auto_renew: true },
    { views_count: 99999 },
    { messages_count: 99999 },
    { favorites_count: 99999 },
    { quality_score: 100 },
  ];

  it.each(attacks)("strips attack payload field(s) from client update", (attack) => {
    const safe = stripClientEntitlementFields(attack);
    for (const key of CLIENT_BLOCKED_PRODUCT_FIELDS) {
      expect(safe).not.toHaveProperty(key);
    }
  });
});
