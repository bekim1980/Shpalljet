import type { EntitlementTypeId } from "@/lib/entitlementCatalogDisplay";

export class CheckoutConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CheckoutConfigError";
  }
}

export class CheckoutAuthError extends Error {
  constructor(message = "Authentication required") {
    super(message);
    this.name = "CheckoutAuthError";
  }
}

/** Start Stripe Checkout — sends only listing ID and catalog entitlement identifier. */
export async function createCheckoutSession(params: {
  productId: string;
  entitlementType: EntitlementTypeId;
  accessToken: string;
}): Promise<{ url: string; sessionId: string; paymentId: string }> {
  if (!params.accessToken) {
    throw new CheckoutAuthError();
  }

  const response = await fetch("/api/stripe/create-checkout-session", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${params.accessToken}`,
    },
    body: JSON.stringify({
      productId: params.productId,
      entitlementType: params.entitlementType,
    }),
  });

  const body = await response.json().catch(() => ({}));

  if (response.status === 401) {
    throw new CheckoutAuthError(typeof body.error === "string" ? body.error : undefined);
  }

  if (response.status === 503 || response.status === 500) {
    const msg = typeof body.error === "string" ? body.error : "Checkout unavailable";
    if (msg.includes("STRIPE") || msg.includes("not configured")) {
      throw new CheckoutConfigError(msg);
    }
    throw new Error(msg);
  }

  if (!response.ok) {
    throw new Error(typeof body.error === "string" ? body.error : "Failed to start checkout");
  }

  if (!body.url || typeof body.url !== "string") {
    throw new Error("Checkout session URL missing from server response");
  }

  return {
    url: body.url,
    sessionId: body.sessionId,
    paymentId: body.paymentId,
  };
}

/** Redirect browser to Stripe Checkout. */
export async function redirectToCheckout(params: {
  productId: string;
  entitlementType: EntitlementTypeId;
  accessToken: string;
}): Promise<void> {
  const { url } = await createCheckoutSession(params);
  window.location.assign(url);
}
