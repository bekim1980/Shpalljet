import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import {
  CheckoutAuthError,
  CheckoutConfigError,
  createCheckoutSession,
} from "@/lib/createCheckoutSession";

describe("createCheckoutSession", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends only productId and entitlementType with auth header", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        url: "https://checkout.stripe.com/test",
        sessionId: "cs_test",
        paymentId: "pay_1",
      }),
    } as Response);

    const result = await createCheckoutSession({
      productId: "listing-123",
      entitlementType: "premium",
      accessToken: "jwt-token",
    });

    expect(fetch).toHaveBeenCalledWith("/api/stripe/create-checkout-session", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer jwt-token",
      },
      body: JSON.stringify({
        productId: "listing-123",
        entitlementType: "premium",
      }),
    });
    expect(result.url).toContain("stripe.com");
  });

  it("throws CheckoutAuthError on 401", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: "Unauthorized" }),
    } as Response);

    await expect(
      createCheckoutSession({
        productId: "x",
        entitlementType: "boost_3",
        accessToken: "bad",
      }),
    ).rejects.toBeInstanceOf(CheckoutAuthError);
  });

  it("throws CheckoutConfigError when Stripe is not configured", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 503,
      json: async () => ({ error: "STRIPE_SECRET_KEY is not configured" }),
    } as Response);

    await expect(
      createCheckoutSession({
        productId: "x",
        entitlementType: "premium",
        accessToken: "jwt",
      }),
    ).rejects.toBeInstanceOf(CheckoutConfigError);
  });

  it("requires access token", async () => {
    await expect(
      createCheckoutSession({
        productId: "x",
        entitlementType: "premium",
        accessToken: "",
      }),
    ).rejects.toBeInstanceOf(CheckoutAuthError);
  });
});
