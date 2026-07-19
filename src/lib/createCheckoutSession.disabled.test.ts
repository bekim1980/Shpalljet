import { describe, expect, it, vi, afterEach } from "vitest";
import { PAYMENTS_DISABLED_MESSAGE } from "@/config/features";
import { createCheckoutSession } from "@/lib/createCheckoutSession";

/**
 * Uses the real PAYMENTS_ENABLED = false flag from features.ts.
 * When re-enabling payments, flip this test to assert the opposite or remove it.
 */
describe("createCheckoutSession with payments shut down", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("rejects without calling the checkout API", async () => {
    vi.stubGlobal("fetch", vi.fn());

    await expect(
      createCheckoutSession({
        productId: "listing-123",
        entitlementType: "premium",
        accessToken: "jwt-token",
      }),
    ).rejects.toThrow(PAYMENTS_DISABLED_MESSAGE);

    expect(fetch).not.toHaveBeenCalled();
  });
});
