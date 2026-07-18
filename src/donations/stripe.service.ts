import { Injectable, HttpException } from "@nestjs/common";
import Stripe from "stripe";

export interface CreateStripeCheckoutParams {
  donationId: number;
  amount: number;
  currency?: string;
  successUrl: string;
  cancelUrl: string;
  donorEmail?: string;
  donorName?: string;
  /** When true, creates a monthly subscription instead of one-time payment */
  isMonthly?: boolean;
}

export interface StripeCheckoutResult {
  paymentUrl: string;
  sessionId: string;
}

export interface CreateStripeEmbedParams {
  donationId: number;
  amount: number;
  currency?: string;
  donorEmail?: string;
  donorName?: string;
  /** When true, creates a monthly subscription; returns clientSecret for first invoice PaymentIntent */
  isMonthly?: boolean;
}

export interface StripeEmbedResult {
  clientSecret: string;
  paymentIntentId: string;
  /** Set when isMonthly: true (Stripe subscription id for recurring charges) */
  subscriptionId?: string;
}

@Injectable()
export class StripeService {
  private stripe: Stripe | null = null;

  constructor() {
    const secretKey = process.env.STRIPE_SECRET_KEY;
    if (secretKey) {
      this.stripe = new Stripe(secretKey, { apiVersion: "2025-02-24.acacia" });
    }
  }

  private ensureStripe(): Stripe {
    if (!this.stripe) {
      throw new HttpException(
        "Stripe is not configured. Set STRIPE_SECRET_KEY in environment.",
        500,
      );
    }
    return this.stripe;
  }

  /**
   * Create a Stripe Checkout Session for a donation.
   * Amount is in major currency units (e.g. PKR or USD); converted to smallest unit for Stripe.
   */
  async createCheckoutSession(
    params: CreateStripeCheckoutParams,
  ): Promise<StripeCheckoutResult> {
    const stripe = this.ensureStripe();
    const currency = (params.currency || "pkr")
      .toLowerCase()
      .replace(/\s/g, "");
    // Stripe expects amount in smallest currency unit (cents for USD, paisas for PKR)
    const isZeroDecimal = ["jpy", "krw", "vnd", "clp"].indexOf(currency) !== -1;
    const unitAmount = isZeroDecimal
      ? Math.round(Number(params.amount))
      : Math.round(Number(params.amount) * 100);

    if (unitAmount < 50) {
      throw new HttpException(
        "Amount is too small for Stripe (minimum 50 smallest units).",
        400,
      );
    }

    const isMonthly = params.isMonthly === true;
    const session = await stripe.checkout.sessions.create({
      mode: isMonthly ? "subscription" : "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: currency === "pkr" ? "pkr" : currency || "usd",
            unit_amount: unitAmount,
            ...(isMonthly && {
              recurring: { interval: "month" as const },
            }),
            product_data: {
              name: isMonthly ? "Monthly Donation" : "Donation",
              description: params.donorName
                ? `Donation from ${params.donorName}`
                : isMonthly
                  ? "Recurring monthly donation"
                  : "Donation",
              metadata: {
                donation_id: String(params.donationId),
              },
            },
          },
        },
      ],
      success_url: params.successUrl,
      cancel_url: params.cancelUrl,
      client_reference_id: String(params.donationId),
      metadata: {
        donation_id: String(params.donationId),
      },
      customer_email: params.donorEmail || undefined,
      subscription_data: isMonthly
        ? { metadata: { donation_id: String(params.donationId) } }
        : undefined,
    });

    if (!session.url) {
      throw new HttpException("Stripe did not return a checkout URL", 502);
    }

    return {
      paymentUrl: session.url,
      sessionId: session.id,
    };
  }

  /**
   * Create a PaymentIntent for embedded payment (Stripe Elements / Payment Element on your page).
   * Returns clientSecret for the frontend to mount the Payment Element and confirm payment.
   */
  async createPaymentIntentForEmbed(
    params: CreateStripeEmbedParams,
  ): Promise<StripeEmbedResult> {
    const stripe = this.ensureStripe();
    const currency = (params.currency || "pkr")
      .toLowerCase()
      .replace(/\s/g, "");
    const isZeroDecimal = ["jpy", "krw", "vnd", "clp"].indexOf(currency) !== -1;
    const amountInSmallestUnit = isZeroDecimal
      ? Math.round(Number(params.amount))
      : Math.round(Number(params.amount) * 100);

    if (amountInSmallestUnit < 50) {
      throw new HttpException(
        "Amount is too small for Stripe (minimum 50 smallest units).",
        400,
      );
    }

    const isMonthly = params.isMonthly === true;

    if (isMonthly) {
      const customer = await stripe.customers.create({
        email: params.donorEmail || undefined,
        name: params.donorName || undefined,
        metadata: { donation_id: String(params.donationId) },
      });
      const product = await stripe.products.create({
        name: "Monthly Donation",
        description: params.donorName
          ? `Monthly donation from ${params.donorName}`
          : "Recurring monthly donation",
        metadata: { donation_id: String(params.donationId) },
      });
      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [
          {
            price_data: {
              product: product.id,
              currency: currency === "pkr" ? "pkr" : currency || "usd",
              unit_amount: amountInSmallestUnit,
              recurring: { interval: "month" },
            },
          },
        ],
        payment_behavior: "default_incomplete",
        payment_settings: { save_default_payment_method: "on_subscription" },
        expand: ["latest_invoice.payment_intent"],
        metadata: { donation_id: String(params.donationId) },
      });

      const invoice = subscription.latest_invoice as Stripe.Invoice;
      const paymentIntent =
        invoice?.payment_intent as Stripe.PaymentIntent | null;
      const clientSecret = paymentIntent?.client_secret;

      if (!clientSecret) {
        throw new HttpException(
          "Stripe did not return a client secret for subscription first payment",
          502,
        );
      }

      return {
        clientSecret,
        paymentIntentId: paymentIntent.id,
        subscriptionId: subscription.id,
      };
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount: amountInSmallestUnit,
      currency: currency === "pkr" ? "pkr" : currency || "usd",
      automatic_payment_methods: { enabled: true },
      metadata: {
        donation_id: String(params.donationId),
      },
      receipt_email: params.donorEmail || undefined,
      description: params.donorName
        ? `Donation from ${params.donorName}`
        : "Donation",
    });

    if (!paymentIntent.client_secret) {
      throw new HttpException(
        "Stripe did not return a client secret for PaymentIntent",
        502,
      );
    }

    return {
      clientSecret: paymentIntent.client_secret,
      paymentIntentId: paymentIntent.id,
    };
  }

  /**
   * Construct webhook event from raw body and signature (for Stripe webhook verification).
   */
  constructWebhookEvent(
    payload: string | Buffer,
    signature: string,
  ): Stripe.Event {
    const stripe = this.ensureStripe();
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new HttpException(
        "STRIPE_WEBHOOK_SECRET is not set. Cannot verify webhook.",
        500,
      );
    }
    return stripe.webhooks.constructEvent(
      payload,
      signature,
      webhookSecret,
    ) as Stripe.Event;
  }
}
