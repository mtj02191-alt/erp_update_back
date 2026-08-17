import { Injectable, HttpException } from "@nestjs/common";
import Stripe from "stripe";

export type StripeRecurringInterval = "day" | "week" | "month" | "year";

export type StripeRecurringStartDateMode =
  | "same_date"
  | "first_of_month"
  | "day_of_month"
  | "custom";

export interface StripeRecurringParams {
  interval: StripeRecurringInterval;
  interval_count?: number;
  start_date_mode?: StripeRecurringStartDateMode | string;
  start_date?: string;
  /** Precomputed unix seconds; if omitted, derived from start_date / mode. */
  billing_cycle_anchor?: number;
  consent?: boolean;
}

export interface CreateStripeCheckoutParams {
  donationId: number;
  amount: number;
  currency?: string;
  successUrl: string;
  cancelUrl: string;
  donorEmail?: string;
  donorName?: string;
  /** When set, creates a subscription with this billing interval. */
  recurring?: StripeRecurringParams;
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
  /** When set, creates a subscription with this billing interval. */
  recurring?: StripeRecurringParams;
}

export interface StripeEmbedResult {
  clientSecret: string;
  paymentIntentId: string;
  /** Set for recurring: Stripe subscription id */
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

  /** For internal services (e.g. named recurring webhook handler). */
  getStripeClient(): Stripe | null {
    return this.stripe;
  }

  private normalizeRecurring(recurring?: StripeRecurringParams): {
    interval: StripeRecurringInterval;
    interval_count: number;
    start_date_mode: StripeRecurringStartDateMode;
    start_date?: string;
    billing_cycle_anchor?: number;
    consent?: boolean;
  } | null {
    if (!recurring?.interval) return null;
    const interval = String(
      recurring.interval,
    ).toLowerCase() as StripeRecurringInterval;
    const allowed: StripeRecurringInterval[] = [
      "day",
      "week",
      "month",
      "year",
    ];
    if (!allowed.includes(interval)) {
      throw new HttpException(
        "recurring.interval must be one of: day, week, month, year",
        400,
      );
    }
    const interval_count = Math.max(
      1,
      Math.floor(Number(recurring.interval_count ?? 1)),
    );
    if (!Number.isFinite(interval_count)) {
      throw new HttpException(
        "recurring.interval_count must be a positive integer",
        400,
      );
    }

    const start_date_mode = this.normalizeStartDateMode(
      recurring.start_date_mode,
    );
    const start_date = recurring.start_date
      ? String(recurring.start_date).trim()
      : undefined;

    if (start_date_mode === "custom" && !start_date) {
      throw new HttpException(
        "recurring.start_date is required when start_date_mode is custom",
        400,
      );
    }

    if (start_date_mode === "day_of_month" && !start_date) {
      throw new HttpException(
        "recurring.start_date is required when start_date_mode is day_of_month",
        400,
      );
    }

    const billing_cycle_anchor =
      recurring.billing_cycle_anchor ??
      this.resolveBillingCycleAnchor(start_date_mode, start_date);

    return {
      interval,
      interval_count,
      start_date_mode,
      start_date,
      billing_cycle_anchor,
      consent: recurring.consent,
    };
  }

  private normalizeStartDateMode(
    mode?: string,
  ): StripeRecurringStartDateMode {
    const m = String(mode || "same_date")
      .trim()
      .toLowerCase();
    if (
      m === "first_of_month" ||
      m === "custom" ||
      m === "same_date" ||
      m === "day_of_month"
    ) {
      return m;
    }
    throw new HttpException(
      "recurring.start_date_mode must be one of: same_date, first_of_month, day_of_month, custom",
      400,
    );
  }

  /**
   * Resolve Stripe billing_cycle_anchor (unix seconds).
   *
   * same_date: undefined — charge now, repeat on the same calendar date (Stripe default).
   * first_of_month / day_of_month / custom: anchor to start_date (or next 1st). When the anchor is in the
   * future we set billing_cycle_anchor and use proration_behavior create_prorations so Stripe
   * still creates an immediate invoice (collects payment method + charges the partial period
   * until the anchor); subsequent full-period invoices align to the 1st / custom date.
   */
  private resolveBillingCycleAnchor(
    mode: StripeRecurringStartDateMode,
    startDate?: string,
  ): number | undefined {
    if (mode === "same_date") return undefined;

    let dateStr = startDate;
    if (mode === "first_of_month" && !dateStr) {
      dateStr = this.nextFirstOfMonthIso();
    }
    if ((mode === "day_of_month" || mode === "custom") && !dateStr) {
      throw new HttpException(
        "recurring.start_date is required for this start_date_mode",
        400,
      );
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      throw new HttpException(
        "recurring.start_date must be YYYY-MM-DD",
        400,
      );
    }

    const [y, m, d] = dateStr.split("-").map(Number);
    const anchor = new Date(Date.UTC(y, m - 1, d, 0, 0, 0));
    if (Number.isNaN(anchor.getTime())) {
      throw new HttpException("recurring.start_date is invalid", 400);
    }

    const todayUtc = new Date();
    const todayStart = Date.UTC(
      todayUtc.getUTCFullYear(),
      todayUtc.getUTCMonth(),
      todayUtc.getUTCDate(),
    );
    if (anchor.getTime() < todayStart) {
      throw new HttpException(
        "recurring.start_date must be today or a future date",
        400,
      );
    }

    // Same calendar day as today → no future anchor needed
    if (anchor.getTime() === todayStart) {
      return undefined;
    }

    return Math.floor(anchor.getTime() / 1000);
  }

  private nextFirstOfMonthIso(): string {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    const day = now.getUTCDate();
    // If today is the 1st, use today; otherwise next month's 1st
    if (day === 1) {
      return `${y}-${String(m + 1).padStart(2, "0")}-01`;
    }
    const next = new Date(Date.UTC(y, m + 1, 1));
    return `${next.getUTCFullYear()}-${String(next.getUTCMonth() + 1).padStart(2, "0")}-01`;
  }

  private recurringProductLabel(
    interval: StripeRecurringInterval,
    interval_count: number,
  ): string {
    if (interval_count === 1) {
      const labels: Record<StripeRecurringInterval, string> = {
        day: "Daily donation",
        week: "Weekly donation",
        month: "Monthly donation",
        year: "Yearly donation",
      };
      return labels[interval];
    }
    return `Recurring donation (every ${interval_count} ${interval}s)`;
  }

  private buildSubscriptionMetadata(
    donationId: number,
    billing: NonNullable<ReturnType<StripeService["normalizeRecurring"]>>,
  ): Record<string, string> {
    const meta: Record<string, string> = {
      donation_id: String(donationId),
      start_date_mode: billing.start_date_mode,
    };
    if (billing.start_date) meta.start_date = billing.start_date;
    if (billing.consent != null) meta.consent = billing.consent ? "true" : "false";
    return meta;
  }

  /**
   * Shared subscription create options for Checkout + Elements.
   * Future billing_cycle_anchor uses create_prorations so Stripe issues an immediate invoice
   * (payment method + first charge) while aligning later cycles to the anchor date.
   */
  private buildSubscriptionCreateParams(params: {
    customerId: string;
    donationId: number;
    amountInSmallestUnit: number;
    stripeCurrency: string;
    productId: string;
    billing: NonNullable<ReturnType<StripeService["normalizeRecurring"]>>;
  }): Stripe.SubscriptionCreateParams {
    const {
      billing,
      customerId,
      donationId,
      amountInSmallestUnit,
      stripeCurrency,
      productId,
    } = params;

    const useFutureAnchor =
      billing.billing_cycle_anchor != null &&
      billing.billing_cycle_anchor > Math.floor(Date.now() / 1000);

    return {
      customer: customerId,
      items: [
        {
          price_data: {
            product: productId,
            currency: stripeCurrency,
            unit_amount: amountInSmallestUnit,
            recurring: {
              interval: billing.interval,
              interval_count: billing.interval_count,
            },
          },
        },
      ],
      payment_behavior: "default_incomplete",
      payment_settings: { save_default_payment_method: "on_subscription" },
      expand: ["latest_invoice.payment_intent"],
      metadata: this.buildSubscriptionMetadata(donationId, billing),
      ...(useFutureAnchor
        ? {
            billing_cycle_anchor: billing.billing_cycle_anchor,
            proration_behavior: "create_prorations" as const,
          }
        : {}),
    };
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

    const billing = this.normalizeRecurring(params.recurring);
    const isSubscription = billing !== null;
    const stripeCurrency = currency === "pkr" ? "pkr" : currency || "usd";

    const useFutureAnchor =
      isSubscription &&
      billing.billing_cycle_anchor != null &&
      billing.billing_cycle_anchor > Math.floor(Date.now() / 1000);

    const session = await stripe.checkout.sessions.create({
      mode: isSubscription ? "subscription" : "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: stripeCurrency,
            unit_amount: unitAmount,
            ...(billing && {
              recurring: {
                interval: billing.interval,
                interval_count: billing.interval_count,
              },
            }),
            product_data: {
              name: isSubscription
                ? this.recurringProductLabel(
                    billing.interval,
                    billing.interval_count,
                  )
                : "Donation",
              description: params.donorName
                ? `Donation from ${params.donorName}`
                : isSubscription
                  ? "Recurring donation"
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
        ...(billing
          ? {
              start_date_mode: billing.start_date_mode,
              ...(billing.start_date ? { start_date: billing.start_date } : {}),
              ...(billing.consent != null
                ? { consent: billing.consent ? "true" : "false" }
                : {}),
            }
          : {}),
      },
      customer_email: params.donorEmail || undefined,
      subscription_data: isSubscription
        ? {
            metadata: this.buildSubscriptionMetadata(params.donationId, billing),
            ...(useFutureAnchor
              ? {
                  billing_cycle_anchor: billing.billing_cycle_anchor,
                  // Immediate prorated invoice until anchor; later cycles on start_date.
                }
              : {}),
          }
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

    const billing = this.normalizeRecurring(params.recurring);
    const stripeCurrency = currency === "pkr" ? "pkr" : currency || "usd";

    if (billing) {
      const customer = await stripe.customers.create({
        email: params.donorEmail || undefined,
        name: params.donorName || undefined,
        metadata: { donation_id: String(params.donationId) },
      });
      const product = await stripe.products.create({
        name: this.recurringProductLabel(
          billing.interval,
          billing.interval_count,
        ),
        description: params.donorName
          ? `Recurring donation from ${params.donorName}`
          : "Recurring donation",
        metadata: { donation_id: String(params.donationId) },
      });

      const subscriptionParams = this.buildSubscriptionCreateParams({
        customerId: customer.id,
        donationId: params.donationId,
        amountInSmallestUnit,
        stripeCurrency,
        productId: product.id,
        billing,
      });

      const subscription = await stripe.subscriptions.create(subscriptionParams);

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
      currency: stripeCurrency,
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
