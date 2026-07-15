import { describe, expect, it } from "vitest";
import {
  buildFreeRenewalUpdates,
  stripClientEntitlementFields,
} from "@/lib/entitlementSecurity";

describe("entitlementSecurity", () => {
  it("strips paid/boost/counter fields from client updates", () => {
    const input = {
      title: "Safe",
      listing_type: "paid",
      is_boosted: true,
      boost_expires_at: "2099-01-01T00:00:00Z",
      auto_renew: true,
      views_count: 999,
    };
    expect(stripClientEntitlementFields(input)).toEqual({ title: "Safe" });
  });

  it("buildFreeRenewalUpdates only includes safe renewal fields", () => {
    const expires = "2026-08-01T00:00:00Z";
    expect(buildFreeRenewalUpdates(expires)).toEqual({
      status: "active",
      expires_at: expires,
    });
  });
});
