import type { VercelRequest, VercelResponse } from "@vercel/node";
import Stripe from "stripe";
import { isSupportedStripeEvent } from "../_lib/entitlementCatalog.js";
import {
  findPaymentIdByStripeIntent,
  findPaymentIdByStripeSession,
  getStripeClient,
  grantEntitlementFromPayment,
  markPaymentCancelled,
  markPaymentDisputed,
  markPaymentFailed,
  markPaymentRefunded,
  markPaymentSucceeded,
  revokeEntitlementFromPayment,
} from "../_lib/stripeEntitlements.js";

export const config = {
  api: { bodyParser: false },
};

async function readRawBody(req: VercelRequest): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) {
    chunks.push(typeof chunk === "string" ? Buffer.from(chunk) : chunk);
  }
  return Buffer.concat(chunks);
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return res.status(503).json({ error: "Webhook not configured" });
  }

  const signature = req.headers["stripe-signature"];
  if (!signature || Array.isArray(signature)) {
    return res.status(400).json({ error: "Missing Stripe signature" });
  }

  let event: Stripe.Event;
  try {
    const rawBody = await readRawBody(req);
    const stripe = getStripeClient();
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch {
    return res.status(400).json({ error: "Invalid signature" });
  }

  if (!isSupportedStripeEvent(event.type)) {
    return res.status(200).json({ received: true, ignored: true });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const paymentId = session.metadata?.payment_id;
        if (!paymentId) break;

        await markPaymentSucceeded({
          paymentId,
          stripePaymentIntentId:
            typeof session.payment_intent === "string"
              ? session.payment_intent
              : session.payment_intent?.id ?? null,
          stripeCheckoutSessionId: session.id,
        });

        await grantEntitlementFromPayment(paymentId, event.id);
        break;
      }

      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        const paymentId =
          session.metadata?.payment_id ??
          (await findPaymentIdByStripeSession(session.id));
        if (paymentId) await markPaymentCancelled(paymentId);
        break;
      }

      case "payment_intent.payment_failed": {
        const intent = event.data.object as Stripe.PaymentIntent;
        const paymentId = await findPaymentIdByStripeIntent(intent.id);
        if (paymentId) await markPaymentFailed(paymentId);
        break;
      }

      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const intentId =
          typeof charge.payment_intent === "string"
            ? charge.payment_intent
            : charge.payment_intent?.id;
        if (!intentId) break;
        const paymentId = await findPaymentIdByStripeIntent(intentId);
        if (!paymentId) break;
        await markPaymentRefunded(paymentId);
        await revokeEntitlementFromPayment(paymentId, event.id, "charge_refunded");
        break;
      }

      case "charge.dispute.created": {
        const dispute = event.data.object as Stripe.Dispute;
        const charge = dispute.charge;
        const chargeId = typeof charge === "string" ? charge : charge?.id;
        if (!chargeId) break;
        const stripe = getStripeClient();
        const chargeObj = await stripe.charges.retrieve(chargeId);
        const intentId =
          typeof chargeObj.payment_intent === "string"
            ? chargeObj.payment_intent
            : chargeObj.payment_intent?.id;
        if (!intentId) break;
        const paymentId = await findPaymentIdByStripeIntent(intentId);
        if (!paymentId) break;
        await markPaymentDisputed(paymentId);
        await revokeEntitlementFromPayment(paymentId, event.id, "charge_disputed");
        break;
      }

      default:
        break;
    }

    return res.status(200).json({ received: true });
  } catch (err) {
    console.error("[stripe-webhook] handler error", err instanceof Error ? err.message : err);
    return res.status(500).json({ error: "Webhook handler failed" });
  }
}
