import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import Stripe from "stripe";
import {
  RecurringDonation,
  RecurringDonationRecordType,
} from "./entities/recurring-donation.entity";
import { Donation } from "../entities/donation.entity";
import { StripeService } from "../stripe.service";

export interface RecurringDonationWebhookResult {
  handled: boolean;
  action?: string;
  recurringDonationId?: number;
  initialDonationId?: number;
}

@Injectable()
export class RecurringDonationsStripeService {
  private readonly logger = new Logger(RecurringDonationsStripeService.name);

  constructor(
    @InjectRepository(RecurringDonation)
    private readonly recurringDonationRepo: Repository<RecurringDonation>,
    @InjectRepository(Donation)
    private readonly donationRepository: Repository<Donation>,
    private readonly stripeService: StripeService,
  ) {}

  /**
   * Stripe recurring handler — additive only; does not replace donations.service webhook logic.
   */
  async handleStripeEvent(
    event: Stripe.Event,
  ): Promise<RecurringDonationWebhookResult> {
    try {
      switch (event.type) {
        case "checkout.session.completed":
          return this.onCheckoutSessionCompleted(event);
        case "payment_intent.succeeded":
          return this.onPaymentIntentSucceeded(event);
        case "invoice.paid":
          return this.onInvoicePaid(event);
        case "invoice.payment_failed":
          return this.onInvoicePaymentFailed(event);
        case "customer.subscription.updated":
          return this.onSubscriptionUpdated(event);
        case "customer.subscription.deleted":
          return this.onSubscriptionDeleted(event);
        default:
          return { handled: false };
      }
    } catch (err: any) {
      this.logger.error(
        `recurring_donations handleStripeEvent ${event.type}: ${err?.message || err}`,
        err?.stack,
      );
      return { handled: false };
    }
  }

  private async eventAlreadyProcessed(stripeEventId: string): Promise<boolean> {
    const existing = await this.recurringDonationRepo.findOne({
      where: { stripe_event_id: stripeEventId },
      select: ["id"],
    });
    return !!existing;
  }

  private async findSubscriptionMaster(
    stripeSubscriptionId: string,
  ): Promise<RecurringDonation | null> {
    return this.recurringDonationRepo.findOne({
      where: {
        stripe_subscription_id: stripeSubscriptionId,
        record_type: "subscription" as RecurringDonationRecordType,
      },
    });
  }

  private async loadInitialDonation(donationId: number): Promise<Donation | null> {
    return this.donationRepository.findOne({ where: { id: donationId } });
  }

  private mapSubscriptionStatus(stripeStatus: string): string {
    const s = String(stripeStatus || "").toLowerCase();
    if (s === "active" || s === "trialing") return "active";
    if (s === "canceled" || s === "unpaid") return "canceled";
    if (s === "past_due" || s === "incomplete") return "past_due";
    return s || "active";
  }

  private async onCheckoutSessionCompleted(
    event: Stripe.Event,
  ): Promise<RecurringDonationWebhookResult> {
    const session = event.data.object as Stripe.Checkout.Session;
    if (session.mode !== "subscription" || !session.subscription) {
      return { handled: false };
    }

    const donationId = session.client_reference_id
      ? parseInt(String(session.client_reference_id), 10)
      : NaN;
    if (!Number.isFinite(donationId) || donationId <= 0) {
      return { handled: false };
    }

    const subscriptionId =
      typeof session.subscription === "string"
        ? session.subscription
        : session.subscription.id;

    if (await this.eventAlreadyProcessed(event.id)) {
      return { handled: true, action: "duplicate_event" };
    }

    const existing = await this.findSubscriptionMaster(subscriptionId);
    if (existing) {
      return {
        handled: true,
        action: "subscription_exists",
        recurringDonationId: existing.id,
        initialDonationId: existing.initial_donation_id,
      };
    }

    const donation = await this.loadInitialDonation(donationId);
    const billing = await this.fetchSubscriptionBilling(subscriptionId);
    const schedule = await this.fetchSubscriptionScheduleMeta(subscriptionId);

    const row = this.recurringDonationRepo.create({
      record_type: "subscription",
      parent_id: null,
      initial_donation_id: donationId,
      donor_id: donation?.donor_id ?? null,
      stripe_subscription_id: subscriptionId,
      stripe_customer_id:
        typeof session.customer === "string"
          ? session.customer
          : session.customer?.id ?? null,
      stripe_event_id: event.id,
      billing_interval: billing?.interval ?? null,
      billing_interval_count: billing?.interval_count ?? 1,
      start_date_mode: schedule.start_date_mode,
      start_date: schedule.start_date,
      consent: schedule.consent,
      consent_at: schedule.consent === true ? new Date() : null,
      amount: donation?.amount ?? null,
      currency: donation?.currency ?? null,
      status: "active",
      donation_method: donation?.donation_method ?? "stripe",
      project_id: donation?.project_id ?? null,
      campaign_id: donation?.campaign_id ?? null,
      donation_type: donation?.donation_type ?? null,
      paid_at: new Date(),
    });
    const saved = await this.recurringDonationRepo.save(row);
    this.logger.log(
      `Recurring donation subscription ${saved.id} for donation ${donationId} (${subscriptionId})`,
    );
    return {
      handled: true,
      action: "subscription_created",
      recurringDonationId: saved.id,
      initialDonationId: donationId,
    };
  }

  private async onPaymentIntentSucceeded(
    event: Stripe.Event,
  ): Promise<RecurringDonationWebhookResult> {
    const pi = event.data.object as Stripe.PaymentIntent;
    const donationIdStr = pi.metadata?.donation_id;
    const donationId = donationIdStr ? parseInt(donationIdStr, 10) : NaN;
    if (!Number.isFinite(donationId) || donationId <= 0) {
      return { handled: false };
    }

    const donation = await this.loadInitialDonation(donationId);
    if (!donation?.orderId?.startsWith("sub_")) {
      return { handled: false };
    }

    const subscriptionId = donation.orderId;
    const existing = await this.findSubscriptionMaster(subscriptionId);
    if (existing) {
      return {
        handled: true,
        action: "subscription_exists",
        recurringDonationId: existing.id,
      };
    }

    if (await this.eventAlreadyProcessed(event.id)) {
      return { handled: true, action: "duplicate_event" };
    }

    const billing = await this.fetchSubscriptionBilling(subscriptionId);
    const schedule = await this.fetchSubscriptionScheduleMeta(subscriptionId);
    const row = this.recurringDonationRepo.create({
      record_type: "subscription",
      parent_id: null,
      initial_donation_id: donationId,
      donor_id: donation.donor_id ?? null,
      stripe_subscription_id: subscriptionId,
      stripe_customer_id:
        typeof pi.customer === "string" ? pi.customer : pi.customer?.id ?? null,
      stripe_payment_intent_id: pi.id,
      stripe_event_id: event.id,
      billing_interval: billing?.interval ?? null,
      billing_interval_count: billing?.interval_count ?? 1,
      start_date_mode: schedule.start_date_mode,
      start_date: schedule.start_date,
      consent: schedule.consent,
      consent_at: schedule.consent === true ? new Date() : null,
      amount: donation.amount ?? null,
      currency: donation.currency ?? null,
      status: "active",
      donation_method: donation.donation_method ?? "stripe_embed",
      project_id: donation.project_id ?? null,
      campaign_id: donation.campaign_id ?? null,
      donation_type: donation.donation_type ?? null,
      paid_at: new Date(),
    });
    const saved = await this.recurringDonationRepo.save(row);
    return {
      handled: true,
      action: "subscription_created_embed",
      recurringDonationId: saved.id,
      initialDonationId: donationId,
    };
  }

  private async onInvoicePaid(
    event: Stripe.Event,
  ): Promise<RecurringDonationWebhookResult> {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId =
      typeof invoice.subscription === "string"
        ? invoice.subscription
        : invoice.subscription?.id;
    if (!subscriptionId) {
      return { handled: false };
    }

    if (invoice.id) {
      const dupInvoice = await this.recurringDonationRepo.findOne({
        where: { stripe_invoice_id: invoice.id },
        select: ["id"],
      });
      if (dupInvoice) {
        return { handled: true, action: "duplicate_invoice" };
      }
    }

    let master = await this.findSubscriptionMaster(subscriptionId);
    if (!master) {
      const donationIdFromMeta = invoice.subscription_details?.metadata
        ?.donation_id as string | undefined;
      const donationId = donationIdFromMeta
        ? parseInt(donationIdFromMeta, 10)
        : NaN;
      if (Number.isFinite(donationId) && donationId > 0) {
        await this.ensureSubscriptionMasterFromDonation(
          subscriptionId,
          donationId,
          invoice,
          event.id,
        );
        master = await this.findSubscriptionMaster(subscriptionId);
      }
    }

    if (!master) {
      this.logger.warn(
        `invoice.paid: no recurring_donations subscription for ${subscriptionId}`,
      );
      return { handled: false };
    }

    const billingReason = invoice.billing_reason ?? null;
    if (billingReason === "subscription_create") {
      if (await this.eventAlreadyProcessed(event.id)) {
        return { handled: true, action: "duplicate_event" };
      }
      await this.recurringDonationRepo.update(master.id, {
        status: "active",
        stripe_event_id: master.stripe_event_id ?? event.id,
      });
      return {
        handled: true,
        action: "first_invoice_ack",
        recurringDonationId: master.id,
        initialDonationId: master.initial_donation_id,
      };
    }

    const amountPaid =
      invoice.amount_paid != null
        ? Math.round(Number(invoice.amount_paid) / 100)
        : master.amount;
    const installment = this.recurringDonationRepo.create({
      record_type: "installment",
      parent_id: master.id,
      initial_donation_id: master.initial_donation_id,
      donor_id: master.donor_id,
      stripe_subscription_id: subscriptionId,
      stripe_customer_id: master.stripe_customer_id,
      stripe_invoice_id: invoice.id ?? null,
      stripe_payment_intent_id:
        typeof invoice.payment_intent === "string"
          ? invoice.payment_intent
          : invoice.payment_intent?.id ?? null,
      stripe_event_id: event.id,
      billing_interval: master.billing_interval,
      billing_interval_count: master.billing_interval_count,
      amount: amountPaid,
      currency: (invoice.currency || master.currency || "pkr").toUpperCase(),
      status: "completed",
      donation_method: master.donation_method,
      project_id: master.project_id,
      campaign_id: master.campaign_id,
      donation_type: master.donation_type,
      paid_at: invoice.status_transitions?.paid_at
        ? new Date(invoice.status_transitions.paid_at * 1000)
        : new Date(),
      stripe_billing_reason: billingReason,
    });
    const saved = await this.recurringDonationRepo.save(installment);
    await this.recurringDonationRepo.update(master.id, { status: "active" });
    this.logger.log(
      `Recurring donation installment ${saved.id} for subscription ${subscriptionId}`,
    );
    return {
      handled: true,
      action: "installment_recorded",
      recurringDonationId: saved.id,
      initialDonationId: master.initial_donation_id,
    };
  }

  private async onInvoicePaymentFailed(
    event: Stripe.Event,
  ): Promise<RecurringDonationWebhookResult> {
    const invoice = event.data.object as Stripe.Invoice;
    const subscriptionId =
      typeof invoice.subscription === "string"
        ? invoice.subscription
        : invoice.subscription?.id;
    if (!subscriptionId) return { handled: false };

    const master = await this.findSubscriptionMaster(subscriptionId);
    if (!master) return { handled: false };

    await this.recurringDonationRepo.update(master.id, { status: "past_due" });
    return {
      handled: true,
      action: "subscription_past_due",
      recurringDonationId: master.id,
      initialDonationId: master.initial_donation_id,
    };
  }

  private async onSubscriptionUpdated(
    event: Stripe.Event,
  ): Promise<RecurringDonationWebhookResult> {
    const sub = event.data.object as Stripe.Subscription;
    const master = await this.findSubscriptionMaster(sub.id);
    if (!master) return { handled: false };

    const billing = sub.items?.data?.[0]?.price?.recurring;
    await this.recurringDonationRepo.update(master.id, {
      status: this.mapSubscriptionStatus(sub.status),
      billing_interval: billing?.interval ?? master.billing_interval,
      billing_interval_count:
        billing?.interval_count ?? master.billing_interval_count,
    });
    return {
      handled: true,
      action: "subscription_updated",
      recurringDonationId: master.id,
      initialDonationId: master.initial_donation_id,
    };
  }

  private async onSubscriptionDeleted(
    event: Stripe.Event,
  ): Promise<RecurringDonationWebhookResult> {
    const sub = event.data.object as Stripe.Subscription;
    const master = await this.findSubscriptionMaster(sub.id);
    if (!master) return { handled: false };

    await this.recurringDonationRepo.update(master.id, { status: "canceled" });
    return {
      handled: true,
      action: "subscription_canceled",
      recurringDonationId: master.id,
      initialDonationId: master.initial_donation_id,
    };
  }

  private async ensureSubscriptionMasterFromDonation(
    subscriptionId: string,
    donationId: number,
    invoice: Stripe.Invoice,
    eventId: string,
  ): Promise<void> {
    const donation = await this.loadInitialDonation(donationId);
    if (!donation) return;
    const billing = await this.fetchSubscriptionBilling(subscriptionId);
    const schedule = await this.fetchSubscriptionScheduleMeta(subscriptionId);
    const row = this.recurringDonationRepo.create({
      record_type: "subscription",
      parent_id: null,
      initial_donation_id: donationId,
      donor_id: donation.donor_id ?? null,
      stripe_subscription_id: subscriptionId,
      stripe_customer_id:
        typeof invoice.customer === "string"
          ? invoice.customer
          : invoice.customer?.id ?? null,
      stripe_event_id: eventId,
      billing_interval: billing?.interval ?? null,
      billing_interval_count: billing?.interval_count ?? 1,
      start_date_mode: schedule.start_date_mode,
      start_date: schedule.start_date,
      consent: schedule.consent,
      consent_at: schedule.consent === true ? new Date() : null,
      amount: donation.amount ?? null,
      currency: donation.currency ?? null,
      status: "active",
      donation_method: donation.donation_method ?? null,
      project_id: donation.project_id ?? null,
      campaign_id: donation.campaign_id ?? null,
      donation_type: donation.donation_type ?? null,
    });
    await this.recurringDonationRepo.save(row);
  }

  private async fetchSubscriptionScheduleMeta(
    subscriptionId: string,
  ): Promise<{
    start_date_mode: string | null;
    start_date: string | null;
    consent: boolean | null;
  }> {
    const stripe = this.stripeService.getStripeClient();
    if (!stripe) {
      return { start_date_mode: null, start_date: null, consent: null };
    }
    try {
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      const meta = sub.metadata || {};
      const consentRaw = meta.consent;
      let consent: boolean | null = null;
      if (consentRaw === "true") consent = true;
      else if (consentRaw === "false") consent = false;
      return {
        start_date_mode: meta.start_date_mode || null,
        start_date: meta.start_date || null,
        consent,
      };
    } catch {
      return { start_date_mode: null, start_date: null, consent: null };
    }
  }

  private async fetchSubscriptionBilling(
    subscriptionId: string,
  ): Promise<{ interval: string; interval_count: number } | null> {
    const stripe = this.stripeService.getStripeClient();
    if (!stripe) return null;
    try {
      const sub = await stripe.subscriptions.retrieve(subscriptionId);
      const recurring = sub.items?.data?.[0]?.price?.recurring;
      if (!recurring?.interval) return null;
      return {
        interval: recurring.interval,
        interval_count: recurring.interval_count ?? 1,
      };
    } catch {
      return null;
    }
  }
}
