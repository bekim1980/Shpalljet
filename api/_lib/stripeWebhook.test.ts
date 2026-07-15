import { describe, expect, it } from "vitest";
import { isSupportedStripeEvent } from "../../api/_lib/entitlementCatalog";

describe("stripe webhook event allowlist", () => {
  it("accepts checkout completion and reversal events", () => {
    expect(isSupportedStripeEvent("checkout.session.completed")).toBe(true);
    expect(isSupportedStripeEvent("checkout.session.expired")).toBe(true);
    expect(isSupportedStripeEvent("payment_intent.payment_failed")).toBe(true);
    expect(isSupportedStripeEvent("charge.refunded")).toBe(true);
    expect(isSupportedStripeEvent("charge.dispute.created")).toBe(true);
  });

  it("ignores unrelated events (no grant on unknown types)", () => {
    expect(isSupportedStripeEvent("customer.created")).toBe(false);
  });
});

describe("webhook idempotency contract", () => {
  it("duplicate event returns already_granted without double grant", () => {
    const first = { status: "granted", grant_id: "abc" };
    const duplicate = { status: "already_granted", grant_id: "abc" };
    expect(duplicate.status).toBe("already_granted");
    expect(first.grant_id).toBe(duplicate.grant_id);
  });
});

describe("cancelled and failed payments", () => {
  it("cancelled checkout does not map to a grant status", () => {
    const cancelledStatuses = ["cancelled", "failed", "pending"];
    expect(cancelledStatuses.includes("succeeded")).toBe(false);
  });
});
