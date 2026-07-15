import Stripe from "stripe";
import { getCatalogEntry, type EntitlementType } from "./entitlementCatalog.js";
import { getSupabaseServiceClient } from "./supabaseService.js";

export function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY is not configured");
  return new Stripe(key, { apiVersion: "2024-06-20" });
}

export async function createListingCheckoutSession(params: {
  userId: string;
  productId: string;
  entitlementType: EntitlementType;
  successUrl: string;
  cancelUrl: string;
}) {
  const catalog = getCatalogEntry(params.entitlementType);
  const supabase = getSupabaseServiceClient();

  const { data: product, error: productError } = await supabase
    .from("products")
    .select("id, seller_id, title")
    .eq("id", params.productId)
    .single();

  if (productError || !product) {
    throw new Error("Listing not found");
  }

  if (product.seller_id !== params.userId) {
    throw new Error("Forbidden: not listing owner");
  }

  const checkoutExpiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

  const { data: paymentRow, error: paymentError } = await supabase
    .from("listing_entitlement_payments")
    .insert({
      user_id: params.userId,
      product_id: params.productId,
      entitlement_type: catalog.entitlementType,
      amount_cents: catalog.amountCents,
      currency: catalog.currency,
      status: "pending",
      checkout_expires_at: checkoutExpiresAt,
    })
    .select("id")
    .single();

  if (paymentError || !paymentRow) {
    throw new Error("Failed to create payment record");
  }

  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    client_reference_id: paymentRow.id,
    metadata: {
      payment_id: paymentRow.id,
      user_id: params.userId,
      product_id: params.productId,
      entitlement_type: catalog.entitlementType,
    },
    line_items: [
      {
        quantity: 1,
        price_data: {
          currency: catalog.currency,
          unit_amount: catalog.amountCents,
          product_data: {
            name: `${catalog.entitlementType} — ${product.title}`,
          },
        },
      },
    ],
  });

  await supabase
    .from("listing_entitlement_payments")
    .update({
      stripe_checkout_session_id: session.id,
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentRow.id);

  return { sessionId: session.id, url: session.url, paymentId: paymentRow.id };
}

export async function markPaymentSucceeded(params: {
  paymentId: string;
  stripePaymentIntentId: string | null;
  stripeCheckoutSessionId: string | null;
}) {
  const supabase = getSupabaseServiceClient();
  const { error } = await supabase
    .from("listing_entitlement_payments")
    .update({
      status: "succeeded",
      stripe_payment_intent_id: params.stripePaymentIntentId,
      stripe_checkout_session_id: params.stripeCheckoutSessionId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", params.paymentId);

  if (error) throw error;
}

export async function markPaymentCancelled(paymentId: string) {
  const supabase = getSupabaseServiceClient();
  await supabase
    .from("listing_entitlement_payments")
    .update({
      status: "cancelled",
      cancelled_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentId);
}

export async function markPaymentFailed(paymentId: string) {
  const supabase = getSupabaseServiceClient();
  await supabase
    .from("listing_entitlement_payments")
    .update({
      status: "failed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentId);
}

export async function markPaymentDisputed(paymentId: string) {
  const supabase = getSupabaseServiceClient();
  await supabase
    .from("listing_entitlement_payments")
    .update({
      status: "disputed",
      disputed_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentId);
}

export async function markPaymentRefunded(paymentId: string) {
  const supabase = getSupabaseServiceClient();
  await supabase
    .from("listing_entitlement_payments")
    .update({
      status: "refunded",
      refunded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", paymentId);
}

export async function grantEntitlementFromPayment(paymentId: string, webhookEventId: string) {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.rpc("grant_listing_entitlement", {
    p_payment_id: paymentId,
    p_webhook_event_id: webhookEventId,
  });

  if (error) throw error;
  return data;
}

export async function revokeEntitlementFromPayment(
  paymentId: string,
  webhookEventId: string,
  reason: string,
) {
  const supabase = getSupabaseServiceClient();
  const { data, error } = await supabase.rpc("revoke_listing_entitlement_from_payment", {
    p_payment_id: paymentId,
    p_webhook_event_id: webhookEventId,
    p_reason: reason,
  });

  if (error) throw error;
  return data;
}

export async function findPaymentIdByStripeSession(sessionId: string): Promise<string | null> {
  const supabase = getSupabaseServiceClient();
  const { data } = await supabase
    .from("listing_entitlement_payments")
    .select("id")
    .eq("stripe_checkout_session_id", sessionId)
    .maybeSingle();
  return data?.id ?? null;
}

export async function findPaymentIdByStripeIntent(intentId: string): Promise<string | null> {
  const supabase = getSupabaseServiceClient();
  const { data } = await supabase
    .from("listing_entitlement_payments")
    .select("id")
    .eq("stripe_payment_intent_id", intentId)
    .maybeSingle();
  return data?.id ?? null;
}
