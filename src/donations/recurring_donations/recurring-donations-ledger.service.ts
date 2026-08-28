import { Injectable, NotFoundException, BadRequestException, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { RecurringDonation } from "./entities/recurring-donation.entity";
import { Donation } from "../entities/donation.entity";
import { Donor } from "src/dms/donor/entities/donor.entity";
import { EmailService } from "../../email/email.service";
import { WhatsAppService } from "../../utils/services/whatsapp.service";
import {
  billingIntervalToFrequency,
  getPeriodKeyForFrequency,
  listPeriodKeysBetween,
} from "src/dms/manual_recurring/utils/manual-recurring-period.util";
import { CampaignTargetFrequency } from "src/dms/campaigns/utils/campaign-recurring.constants";
import {
  MAX_UNPAID_PAYMENT_REMINDERS_BEFORE_DISABLE,
  RECURRING_SUBSCRIPTION_DISABLED_REASON,
  RECURRING_SUBSCRIPTION_DISABLED_STATUS,
} from "./recurring-donations.constants";
import {
  isSubscriptionPrepaidPeriodCovered,
  listPrepaidPeriodKeysInRange,
  prepaidInstallmentInvoiceKey,
  resolvePrepaidPeriodCount,
  resolveSubscriptionPrepaidPeriodKeys,
} from "./recurring-prepaid.util";

const SORTABLE_FIELDS = new Set([
  "id",
  "created_at",
  "updated_at",
  "status",
  "amount",
  "paid_at",
  "billing_interval",
]);

@Injectable()
export class RecurringDonationsLedgerService {
  private readonly logger = new Logger(RecurringDonationsLedgerService.name);

  constructor(
    @InjectRepository(RecurringDonation)
    private readonly recurringDonationRepo: Repository<RecurringDonation>,
    @InjectRepository(Donation)
    private readonly donationRepository: Repository<Donation>,
    @InjectRepository(Donor)
    private readonly donorRepository: Repository<Donor>,
    private readonly emailService: EmailService,
    private readonly whatsAppService: WhatsAppService,
  ) {}

  async search(payload: Record<string, any>) {
    const pagination = payload.pagination || {};
    const page = Math.max(1, Number(pagination.page) || 1);
    let pageSize = Number(pagination.pageSize);
    if (!Number.isFinite(pageSize)) pageSize = 10;
    if (pagination.pageSize === 0) pageSize = 0;

    const sortField = SORTABLE_FIELDS.has(pagination.sortField)
      ? pagination.sortField
      : "created_at";
    const sortOrder =
      String(pagination.sortOrder || "DESC").toUpperCase() === "ASC"
        ? "ASC"
        : "DESC";

    const filters = payload.filters || payload;

    const qb = this.recurringDonationRepo
      .createQueryBuilder("rd")
      .leftJoin(Donation, "d", "d.id = rd.initial_donation_id")
      .leftJoin(Donor, "donor", "donor.id = rd.donor_id")
      .where("rd.record_type = :recordType", { recordType: "subscription" })
      .andWhere("rd.is_archived = false");

    if (filters.status) {
      qb.andWhere("rd.status = :status", { status: filters.status });
    }
    if (filters.billing_interval) {
      qb.andWhere("rd.billing_interval = :billingInterval", {
        billingInterval: filters.billing_interval,
      });
    }
    if (filters.donor_id) {
      qb.andWhere("rd.donor_id = :donorId", {
        donorId: Number(filters.donor_id),
      });
    }
    if (filters.search) {
      const term = `%${String(filters.search).trim()}%`;
      qb.andWhere(
        `(rd.stripe_subscription_id ILIKE :term OR d."orderId" ILIKE :term OR donor.email ILIKE :term OR donor.name ILIKE :term OR donor.first_name ILIKE :term OR donor.last_name ILIKE :term)`,
        { term },
      );
    }

    // Created-at date filters (same keys as donations listing)
    const exactDate = String(filters.date || "").trim();
    const rangeStart = String(filters.start_date || "").trim();
    const rangeEnd = String(filters.end_date || "").trim();
    if (rangeStart && rangeEnd) {
      qb.andWhere(`DATE(rd.created_at) BETWEEN :rangeStart AND :rangeEnd`, {
        rangeStart,
        rangeEnd,
      });
    } else if (rangeStart) {
      qb.andWhere(`DATE(rd.created_at) >= :rangeStart`, { rangeStart });
    } else if (rangeEnd) {
      qb.andWhere(`DATE(rd.created_at) <= :rangeEnd`, { rangeEnd });
    } else if (exactDate) {
      qb.andWhere(`DATE(rd.created_at) = :exactDate`, { exactDate });
    }

    // Payment / installment collection filters (subscription list):
    // - pending: has open period dues OR no completed installment yet
    // - pending_dues: at least one pending period due
    // - pending_initial: initial donation still pending/failed
    // - completed: at least one completed installment
    const installmentStatus = String(filters.installment_status || "")
      .trim()
      .toLowerCase();
    const hasCompletedInstallmentSql = `EXISTS (
      SELECT 1 FROM recurring_donations inst
      WHERE inst.parent_id = rd.id
        AND inst.record_type = 'installment'
        AND inst.is_archived = false
        AND LOWER(COALESCE(inst.status, '')) IN ('completed', 'paid', 'success')
    )`;
    const hasPendingDueSql = `EXISTS (
      SELECT 1 FROM recurring_donations inst
      WHERE inst.parent_id = rd.id
        AND inst.record_type = 'installment'
        AND inst.is_archived = false
        AND LOWER(COALESCE(inst.status, '')) = 'pending'
    )`;
    if (installmentStatus === "pending_dues" || installmentStatus === "arrears") {
      qb.andWhere(hasPendingDueSql);
    } else if (installmentStatus === "pending") {
      qb.andWhere(`(NOT ${hasCompletedInstallmentSql} OR ${hasPendingDueSql})`);
    } else if (installmentStatus === "pending_initial") {
      qb.andWhere("rd.initial_donation_id IS NOT NULL");
      qb.andWhere("LOWER(COALESCE(d.status, '')) IN (:...pendingDonationStatuses)", {
        pendingDonationStatuses: ["pending", "failed"],
      });
    } else if (installmentStatus === "completed") {
      qb.andWhere(hasCompletedInstallmentSql);
    }

    const total = await qb.clone().getCount();

    qb.select([
      "rd.id AS id",
      "rd.initial_donation_id AS initial_donation_id",
      "rd.donor_id AS donor_id",
      "rd.stripe_subscription_id AS stripe_subscription_id",
      "rd.stripe_customer_id AS stripe_customer_id",
      "rd.billing_interval AS billing_interval",
      "rd.billing_interval_count AS billing_interval_count",
      "rd.start_date_mode AS start_date_mode",
      "rd.start_date AS start_date",
      "rd.consent AS consent",
      "rd.consent_at AS consent_at",
      "rd.amount AS amount",
      "rd.currency AS currency",
      "rd.status AS status",
      "rd.donation_method AS donation_method",
      "rd.project_id AS project_id",
      "rd.campaign_id AS campaign_id",
      "rd.donation_type AS donation_type",
      "rd.prepaid_months AS prepaid_months",
      "rd.prepaid_periods AS prepaid_periods",
      "rd.prepaid_start_period_key AS prepaid_start_period_key",
      "rd.prepaid_end_period_key AS prepaid_end_period_key",
      "rd.paid_at AS paid_at",
      "rd.created_at AS created_at",
      "rd.updated_at AS updated_at",
      'd."orderId" AS initial_order_id',
      "d.status AS initial_donation_status",
      "donor.name AS donor_name",
      "donor.email AS donor_email",
    ])
      .addSelect(
        `(SELECT COUNT(*)::int FROM recurring_donations inst WHERE inst.parent_id = rd.id AND inst.record_type = 'installment' AND inst.is_archived = false)`,
        "installment_count",
      )
      .addSelect(
        `(SELECT COUNT(*)::int FROM recurring_donations inst WHERE inst.parent_id = rd.id AND inst.record_type = 'installment' AND inst.is_archived = false AND LOWER(COALESCE(inst.status, '')) IN ('completed', 'paid', 'success'))`,
        "completed_installment_count",
      )
      .addSelect(
        `(SELECT COUNT(*)::int FROM recurring_donations inst WHERE inst.parent_id = rd.id AND inst.record_type = 'installment' AND inst.is_archived = false AND LOWER(COALESCE(inst.status, '')) = 'pending')`,
        "pending_installment_count",
      )
      .orderBy(`rd.${sortField}`, sortOrder);

    if (pageSize > 0) {
      qb.offset((page - 1) * pageSize).limit(pageSize);
    }

    const rows = await qb.getRawMany();

    const totalPages =
      pageSize > 0 ? Math.max(1, Math.ceil(total / pageSize)) : 1;

    return {
      data: rows,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
      },
    };
  }

  async findOne(id: number) {
    const subscription = await this.recurringDonationRepo.findOne({
      where: {
        id,
        record_type: "subscription",
        is_archived: false,
      },
    });

    if (!subscription) {
      throw new NotFoundException("Recurring donation subscription not found");
    }

    // Ensure current period due exists for non-Stripe (does not create donations)
    if (!subscription.stripe_subscription_id) {
      await this.ensurePeriodDuesForSubscription(subscription);
    }

    const [installments, initialDonation, donor] = await Promise.all([
      this.recurringDonationRepo.find({
        where: {
          parent_id: id,
          record_type: "installment",
          is_archived: false,
        },
        order: { period_key: "ASC", created_at: "ASC", id: "ASC" },
      }),
      subscription.initial_donation_id
        ? this.donationRepository.findOne({
            where: { id: subscription.initial_donation_id },
            select: [
              "id",
              "orderId",
              "amount",
              "currency",
              "status",
              "donation_method",
              "created_at",
            ],
          })
        : null,
      subscription.donor_id
        ? this.donorRepository.findOne({
            where: { id: subscription.donor_id },
            select: ["id", "name", "first_name", "last_name", "email", "phone"],
          })
        : null,
    ]);

    const completed = installments.filter((row) =>
      ["completed", "paid", "success"].includes(
        String(row.status || "").toLowerCase(),
      ),
    );
    const pending = installments.filter(
      (row) => String(row.status || "").toLowerCase() === "pending",
    );
    const totalPaid = completed.reduce(
      (sum, row) => sum + (Number(row.amount) || 0),
      0,
    );
    const arrearsAmount = pending.reduce(
      (sum, row) => sum + (Number(row.amount) || 0),
      0,
    );

    return {
      subscription,
      installments,
      initial_donation: initialDonation,
      donor,
      summary: {
        installment_count: installments.length,
        completed_installment_count: completed.length,
        pending_installment_count: pending.length,
        total_paid_amount: totalPaid,
        arrears_amount: arrearsAmount,
      },
    };
  }

  /**
   * Non-Stripe recurring: same Recurring Donations list as Stripe.
   * Stripe auto-charges; these rows are reminded via cron.
   */
  async ensureNonStripeSubscriptionFromDonation(params: {
    donationId: number;
    donorId: number | null;
    amount: number | null;
    currency?: string | null;
    donationMethod?: string | null;
    projectId?: string | null;
    campaignId?: number | null;
    donationType?: string | null;
    billingInterval: "day" | "week" | "month";
    billingIntervalCount?: number;
    startDateMode?: string | null;
    startDate?: string | null;
    consent?: boolean | null;
    prepaidPeriods?: number | null;
  }): Promise<RecurringDonation | null> {
    if (!params.donationId) return null;

    const existing = await this.recurringDonationRepo.findOne({
      where: {
        initial_donation_id: params.donationId,
        record_type: "subscription",
        is_archived: false,
      },
    });
    if (existing) {
      const patch: Partial<RecurringDonation> = {};
      if (params.donorId && !existing.donor_id) patch.donor_id = params.donorId;
      if (params.consent === true && existing.consent !== true) {
        patch.consent = true;
        patch.consent_at = new Date();
      }
      const prepaid = resolveSubscriptionPrepaidPeriodKeys(
        params.prepaidPeriods,
        params.billingInterval,
      );
      if (
        prepaid.prepaidPeriods &&
        !existing.prepaid_periods &&
        !existing.prepaid_start_period_key
      ) {
        patch.prepaid_periods = prepaid.prepaidPeriods;
        patch.prepaid_months = prepaid.prepaidMonths;
        patch.prepaid_start_period_key = prepaid.start;
        patch.prepaid_end_period_key = prepaid.end;
      }
      if (Object.keys(patch).length) {
        await this.recurringDonationRepo.update(existing.id, patch);
        return this.recurringDonationRepo.findOne({ where: { id: existing.id } });
      }
      return existing;
    }

    const prepaid = resolveSubscriptionPrepaidPeriodKeys(
      params.prepaidPeriods,
      params.billingInterval,
    );

    const row = this.recurringDonationRepo.create({
      record_type: "subscription",
      parent_id: null,
      initial_donation_id: params.donationId,
      donor_id: params.donorId,
      stripe_subscription_id: null,
      stripe_customer_id: null,
      billing_interval: params.billingInterval,
      billing_interval_count: params.billingIntervalCount ?? 1,
      start_date_mode: params.startDateMode ?? "same_date",
      start_date: params.startDate ?? null,
      consent: params.consent ?? null,
      consent_at: params.consent === true ? new Date() : null,
      amount: params.amount,
      currency: params.currency || "PKR",
      status: "active",
      donation_method: params.donationMethod ?? null,
      project_id: params.projectId ?? null,
      campaign_id: params.campaignId ?? null,
      donation_type: params.donationType ?? null,
      prepaid_months: prepaid.prepaidMonths,
      prepaid_periods: prepaid.prepaidPeriods,
      prepaid_start_period_key: prepaid.start,
      prepaid_end_period_key: prepaid.end,
    });
    return this.recurringDonationRepo.save(row);
  }

  /**
   * When a non-Stripe donation linked to a subscription is completed,
   * settle the oldest pending period due (FIFO). Never deletes donors/donations.
   * If no pending due exists, creates a completed installment (legacy / first pay).
   */
  async recordNonStripeInstallmentFromDonation(
    donationId: number,
  ): Promise<{ recorded: boolean; reason?: string }> {
    if (!donationId) {
      return { recorded: false, reason: "Missing donation id" };
    }

    const donation = await this.donationRepository.findOne({
      where: { id: donationId },
    });
    if (!donation) {
      return { recorded: false, reason: "Donation not found" };
    }

    const status = String(donation.status || "")
      .trim()
      .toLowerCase();
    if (!["completed", "paid", "success"].includes(status)) {
      return { recorded: false, reason: "Donation not successful yet" };
    }

    // Prefer subscription created from this donation; else active non-Stripe sub for donor
    let master = await this.recurringDonationRepo.findOne({
      where: {
        initial_donation_id: donationId,
        record_type: "subscription",
        is_archived: false,
      },
    });

    if (!master && donation.donor_id) {
      const taggedSubId = Number(
        (donation as any)?.manual_recurring_intent?.recurring_subscription_id,
      );
      if (Number.isFinite(taggedSubId) && taggedSubId > 0) {
        master = await this.recurringDonationRepo.findOne({
          where: {
            id: taggedSubId,
            record_type: "subscription",
            is_archived: false,
          },
        });
      }
    }

    if (!master && donation.donor_id) {
      master = await this.recurringDonationRepo
        .createQueryBuilder("rd")
        .where("rd.record_type = :type", { type: "subscription" })
        .andWhere("rd.is_archived = false")
        .andWhere("rd.status = :status", { status: "active" })
        .andWhere("rd.stripe_subscription_id IS NULL")
        .andWhere("rd.donor_id = :donorId", { donorId: donation.donor_id })
        .orderBy("rd.id", "DESC")
        .getOne();
    }

    if (!master) {
      return { recorded: false, reason: "No non-Stripe subscription found" };
    }
    if (master.stripe_subscription_id) {
      return {
        recorded: false,
        reason: "Stripe subscription — installments via webhook",
      };
    }

    const invoiceKey = `donation-${donationId}`;
    const existing = await this.recurringDonationRepo.findOne({
      where: {
        record_type: "installment",
        stripe_invoice_id: invoiceKey,
        is_archived: false,
      },
    });
    if (existing) {
      return { recorded: false, reason: "Installment already recorded" };
    }

    const isInitial = master.initial_donation_id === donationId;
    const prepaidPeriods = resolvePrepaidPeriodCount({
      prepaid_periods: master.prepaid_periods,
      prepaid_months: master.prepaid_months,
    });
    if (
      isInitial &&
      prepaidPeriods != null &&
      prepaidPeriods >= 1 &&
      master.prepaid_start_period_key &&
      master.prepaid_end_period_key
    ) {
      const prepaidResult = await this.settlePrepaidPeriodsFromDonation(
        master,
        donation,
      );
      if (prepaidResult.recorded) {
        return prepaidResult;
      }
      const fullySettled = await this.isPrepaidCoverageFullySettled(master);
      if (fullySettled) {
        return {
          recorded: false,
          reason: prepaidResult.reason || "Prepaid periods already settled",
        };
      }
    }

    // Open current (+ gap) period dues before settling so first pay always has a target
    await this.ensurePeriodDuesForSubscription(master);

    const oldestPending = await this.recurringDonationRepo
      .createQueryBuilder("inst")
      .where("inst.parent_id = :parentId", { parentId: master.id })
      .andWhere("inst.record_type = :type", { type: "installment" })
      .andWhere("inst.is_archived = false")
      .andWhere("LOWER(COALESCE(inst.status, '')) = :status", {
        status: "pending",
      })
      .orderBy("inst.period_key", "ASC")
      .addOrderBy("inst.created_at", "ASC")
      .addOrderBy("inst.id", "ASC")
      .getOne();

    const paidAt = new Date();
    const amount = donation.amount ?? master.amount;
    const currency = donation.currency || master.currency || "PKR";

    if (oldestPending) {
      await this.recurringDonationRepo.update(oldestPending.id, {
        initial_donation_id: master.initial_donation_id,
        donor_id: master.donor_id ?? donation.donor_id,
        stripe_invoice_id: invoiceKey,
        stripe_payment_intent_id: String(donationId),
        amount,
        currency,
        status: "completed",
        donation_method: donation.donation_method || master.donation_method,
        project_id: donation.project_id || master.project_id,
        campaign_id: donation.campaign_id ?? master.campaign_id,
        donation_type: donation.donation_type || master.donation_type,
        paid_at: paidAt,
        stripe_billing_reason: isInitial
          ? "initial_payment"
          : "period_settled",
      });
    } else {
      const frequency = billingIntervalToFrequency(master.billing_interval);
      const periodKey = frequency
        ? getPeriodKeyForFrequency(frequency)
        : null;
      const installment = this.recurringDonationRepo.create({
        record_type: "installment",
        parent_id: master.id,
        initial_donation_id: master.initial_donation_id,
        donor_id: master.donor_id ?? donation.donor_id,
        stripe_subscription_id: null,
        stripe_invoice_id: invoiceKey,
        stripe_payment_intent_id: String(donationId),
        billing_interval: master.billing_interval,
        billing_interval_count: master.billing_interval_count,
        amount,
        currency,
        status: "completed",
        donation_method: donation.donation_method || master.donation_method,
        project_id: donation.project_id || master.project_id,
        campaign_id: donation.campaign_id ?? master.campaign_id,
        donation_type: donation.donation_type || master.donation_type,
        paid_at: paidAt,
        period_key: periodKey,
        stripe_billing_reason: isInitial
          ? "initial_payment"
          : "manual_payment",
      });
      await this.recurringDonationRepo.save(installment);
    }

    if (master.status !== "active") {
      await this.recurringDonationRepo.update(master.id, { status: "active" });
    }

    // --- ENABLE LATER: donor paid — reset unpaid reminder streak ---
    // await this.resetUnpaidPaymentReminderCount(master.id);
    // --- END ENABLE LATER ---

    return { recorded: true };
  }

  /** Whether a completed installment exists for this subscription + period. */
  async hasCompletedInstallmentForPeriod(
    subscriptionId: number,
    periodKey: string,
  ): Promise<boolean> {
    if (!subscriptionId || !periodKey) return false;
    const row = await this.recurringDonationRepo
      .createQueryBuilder("inst")
      .where("inst.parent_id = :parentId", { parentId: subscriptionId })
      .andWhere("inst.record_type = :type", { type: "installment" })
      .andWhere("inst.is_archived = false")
      .andWhere("inst.period_key = :periodKey", { periodKey })
      .andWhere("LOWER(COALESCE(inst.status, '')) IN (:...statuses)", {
        statuses: ["completed", "paid", "success"],
      })
      .getOne();
    return Boolean(row);
  }

  async isPrepaidCoverageFullySettled(
    subscription: Pick<
      RecurringDonation,
      | "id"
      | "prepaid_start_period_key"
      | "prepaid_end_period_key"
      | "billing_interval"
    >,
  ): Promise<boolean> {
    if (
      !subscription?.id ||
      !subscription.prepaid_start_period_key ||
      !subscription.prepaid_end_period_key
    ) {
      return false;
    }
    const periodKeys = listPrepaidPeriodKeysInRange(
      subscription.prepaid_start_period_key,
      subscription.prepaid_end_period_key,
      subscription.billing_interval || "month",
    );
    if (!periodKeys.length) return false;
    const settled = await Promise.all(
      periodKeys.map((pk) =>
        this.hasCompletedInstallmentForPeriod(subscription.id, pk),
      ),
    );
    return settled.every(Boolean);
  }

  /**
   * Split upfront prepaid payment into one completed installment per covered period.
   * Each period gets the subscription per-period amount (total ÷ prepaid_periods).
   */
  private async settlePrepaidPeriodsFromDonation(
    master: RecurringDonation,
    donation: Donation,
  ): Promise<{ recorded: boolean; reason?: string }> {
    const startKey = master.prepaid_start_period_key;
    const endKey = master.prepaid_end_period_key;
    if (!startKey || !endKey) {
      return { recorded: false, reason: "Missing prepaid period keys" };
    }

    const periodKeys = listPrepaidPeriodKeysInRange(
      startKey,
      endKey,
      master.billing_interval || "month",
    );
    if (!periodKeys.length) {
      return { recorded: false, reason: "No prepaid periods" };
    }

    const allSettled = await Promise.all(
      periodKeys.map((pk) =>
        this.hasCompletedInstallmentForPeriod(master.id, pk),
      ),
    );
    if (allSettled.every(Boolean)) {
      return { recorded: false, reason: "Prepaid periods already settled" };
    }

    const paidAt = new Date();
    const periodAmount = Number(master.amount) || 0;
    const currency = donation.currency || master.currency || "PKR";
    let created = 0;

    for (const periodKey of periodKeys) {
      const invoiceKey = prepaidInstallmentInvoiceKey(donation.id, periodKey);

      const byInvoice = await this.recurringDonationRepo.findOne({
        where: {
          record_type: "installment",
          stripe_invoice_id: invoiceKey,
          is_archived: false,
        },
      });
      if (byInvoice) continue;

      const pending = await this.recurringDonationRepo.findOne({
        where: {
          parent_id: master.id,
          record_type: "installment",
          period_key: periodKey,
          is_archived: false,
        },
      });

      if (pending) {
        await this.recurringDonationRepo.update(pending.id, {
          initial_donation_id: master.initial_donation_id,
          donor_id: master.donor_id ?? donation.donor_id,
          stripe_invoice_id: invoiceKey,
          stripe_payment_intent_id: String(donation.id),
          amount: periodAmount,
          currency,
          status: "completed",
          donation_method: donation.donation_method || master.donation_method,
          project_id: donation.project_id || master.project_id,
          campaign_id: donation.campaign_id ?? master.campaign_id,
          donation_type: donation.donation_type || master.donation_type,
          paid_at: paidAt,
          stripe_billing_reason: "prepaid_period",
        });
        created += 1;
        continue;
      }

      const existingCompleted = await this.recurringDonationRepo
        .createQueryBuilder("inst")
        .where("inst.parent_id = :parentId", { parentId: master.id })
        .andWhere("inst.period_key = :periodKey", { periodKey })
        .andWhere("inst.record_type = :type", { type: "installment" })
        .andWhere("inst.is_archived = false")
        .andWhere("LOWER(COALESCE(inst.status, '')) IN (:...statuses)", {
          statuses: ["completed", "paid", "success"],
        })
        .getOne();
      if (existingCompleted) continue;

      const installment = this.recurringDonationRepo.create({
        record_type: "installment",
        parent_id: master.id,
        initial_donation_id: master.initial_donation_id,
        donor_id: master.donor_id ?? donation.donor_id,
        stripe_subscription_id: null,
        stripe_invoice_id: invoiceKey,
        stripe_payment_intent_id: String(donation.id),
        billing_interval: master.billing_interval,
        billing_interval_count: master.billing_interval_count,
        amount: periodAmount,
        currency,
        status: "completed",
        donation_method: donation.donation_method || master.donation_method,
        project_id: donation.project_id || master.project_id,
        campaign_id: donation.campaign_id ?? master.campaign_id,
        donation_type: donation.donation_type || master.donation_type,
        paid_at: paidAt,
        period_key: periodKey,
        stripe_billing_reason: "prepaid_period",
      });
      await this.recurringDonationRepo.save(installment);
      created += 1;
    }

    if (master.status !== "active") {
      await this.recurringDonationRepo.update(master.id, { status: "active" });
    }

    if (created === 0 && allSettled.some(Boolean)) {
      return { recorded: false, reason: "Prepaid periods already settled" };
    }

    return { recorded: created > 0 };
  }

  /**
   * Ensure pending period-due installment rows exist through the current period.
   * Does not create or modify donations/donors. Skips periods already covered by
   * legacy completed installments that have no period_key (chronological credit).
   */
  async ensurePeriodDuesForSubscription(
    subscription: RecurringDonation,
    options?: { upToPeriodKey?: string; maxKeys?: number },
  ): Promise<{ created: number; pending_count: number }> {
    if (!subscription?.id || subscription.stripe_subscription_id) {
      return { created: 0, pending_count: 0 };
    }

    const frequency = billingIntervalToFrequency(subscription.billing_interval);
    if (!frequency) {
      return { created: 0, pending_count: 0 };
    }

    const now = new Date();
    const upToKey =
      options?.upToPeriodKey || getPeriodKeyForFrequency(frequency, now);
    const startRef = this.resolveSubscriptionPeriodStart(subscription);
    const endRef = this.resolvePeriodKeyEndRef(frequency, upToKey, now);
    const maxKeys = options?.maxKeys ?? 36;
    const periodKeys = listPeriodKeysBetween(
      frequency,
      startRef,
      endRef,
      maxKeys,
    );

    const existing = await this.recurringDonationRepo.find({
      where: {
        parent_id: subscription.id,
        record_type: "installment",
        is_archived: false,
      },
      select: ["id", "period_key", "status"],
    });

    const keyed = new Set(
      existing
        .map((r) => String(r.period_key || "").trim())
        .filter(Boolean),
    );
    const legacyCompletedCount = existing.filter((r) => {
      const st = String(r.status || "").toLowerCase();
      return (
        !r.period_key &&
        ["completed", "paid", "success"].includes(st)
      );
    }).length;

    let created = 0;
    let skipLegacy = legacyCompletedCount;

    for (const periodKey of periodKeys) {
      if (keyed.has(periodKey)) continue;

      if (isSubscriptionPrepaidPeriodCovered(subscription, periodKey)) {
        // Prepaid coverage — installments created on payment, not pending dues
        continue;
      }

      const isCurrent = periodKey === upToKey;
      // Credit historical completed installments (no period_key) against older periods only
      if (!isCurrent && skipLegacy > 0) {
        skipLegacy -= 1;
        continue;
      }

      const row = this.recurringDonationRepo.create({
        record_type: "installment",
        parent_id: subscription.id,
        initial_donation_id: subscription.initial_donation_id,
        donor_id: subscription.donor_id,
        stripe_subscription_id: null,
        stripe_invoice_id: null,
        billing_interval: subscription.billing_interval,
        billing_interval_count: subscription.billing_interval_count,
        amount: subscription.amount,
        currency: subscription.currency || "PKR",
        status: "pending",
        donation_method: subscription.donation_method,
        project_id: subscription.project_id,
        campaign_id: subscription.campaign_id,
        donation_type: subscription.donation_type,
        paid_at: null,
        period_key: periodKey,
        stripe_billing_reason: "period_due",
      });
      await this.recurringDonationRepo.save(row);
      keyed.add(periodKey);
      created += 1;
    }

    const pending_count = await this.recurringDonationRepo
      .createQueryBuilder("inst")
      .where("inst.parent_id = :parentId", { parentId: subscription.id })
      .andWhere("inst.record_type = :type", { type: "installment" })
      .andWhere("inst.is_archived = false")
      .andWhere("LOWER(COALESCE(inst.status, '')) = :status", {
        status: "pending",
      })
      .getCount();

    return { created, pending_count };
  }

  private resolveSubscriptionPeriodStart(
    subscription: RecurringDonation,
  ): Date {
    if (subscription.start_date) {
      const d = new Date(`${subscription.start_date}T00:00:00`);
      if (!Number.isNaN(d.getTime())) return d;
    }
    if (subscription.created_at) {
      return new Date(subscription.created_at);
    }
    return new Date();
  }

  /** Approximate a Date inside a period key for listPeriodKeysBetween end bound. */
  private resolvePeriodKeyEndRef(
    frequency: CampaignTargetFrequency,
    periodKey: string,
    fallback: Date,
  ): Date {
    const monthly = /^(\d{4})-(\d{2})$/.exec(periodKey);
    if (monthly) {
      return new Date(Number(monthly[1]), Number(monthly[2]) - 1, 15);
    }
    const daily = /^(\d{4})-(\d{2})-(\d{2})$/.exec(periodKey);
    if (daily) {
      return new Date(
        Number(daily[1]),
        Number(daily[2]) - 1,
        Number(daily[3]),
      );
    }
    const weekly = /^(\d{4}-\d{2}-\d{2})_(\d{4}-\d{2}-\d{2})$/.exec(periodKey);
    if (weekly) {
      return new Date(weekly[1] + "T12:00:00");
    }
    if (frequency === CampaignTargetFrequency.YEARLY && /^\d{4}$/.test(periodKey)) {
      return new Date(Number(periodKey), 6, 1);
    }
    return fallback;
  }

  /**
   * Unpaid payment reminder tracking — used when auto-disable after 3 reminders is enabled.
   * Wire via commented blocks in processNonStripeLedgerReminders + sendInstallmentPaymentLink.
   */
  getUnpaidPaymentReminderCount(subscription: RecurringDonation | null | undefined): number {
    const n = Number(subscription?.unpaid_payment_reminder_count ?? 0);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0;
  }

  isSubscriptionDisabledByUnpaidReminders(
    subscription: RecurringDonation | null | undefined,
  ): boolean {
    if (!subscription) return false;
    const status = String(subscription.status || "").toLowerCase();
    if (status === RECURRING_SUBSCRIPTION_DISABLED_STATUS) {
      return (
        String(subscription.stripe_billing_reason || "") ===
        RECURRING_SUBSCRIPTION_DISABLED_REASON
      );
    }
    return (
      this.getUnpaidPaymentReminderCount(subscription) >=
      MAX_UNPAID_PAYMENT_REMINDERS_BEFORE_DISABLE
    );
  }

  async isSubscriptionBlockedByUnpaidReminders(
    subscriptionId: number,
  ): Promise<boolean> {
    const subscription = await this.recurringDonationRepo.findOne({
      where: {
        id: subscriptionId,
        record_type: "subscription",
        is_archived: false,
      },
    });
    if (!subscription) return true;
    if (subscription.stripe_subscription_id) return false;
    return this.isSubscriptionDisabledByUnpaidReminders(subscription);
  }

  /** Call after a successful payment-link reminder send. Returns new count + whether disabled. */
  async recordUnpaidPaymentReminderSent(subscriptionId: number): Promise<{
    count: number;
    disabled: boolean;
  }> {
    const subscription = await this.recurringDonationRepo.findOne({
      where: {
        id: subscriptionId,
        record_type: "subscription",
        is_archived: false,
      },
    });
    if (!subscription || subscription.stripe_subscription_id) {
      return { count: 0, disabled: false };
    }

    const nextCount =
      this.getUnpaidPaymentReminderCount(subscription) + 1;
    const patch: Partial<RecurringDonation> = {
      unpaid_payment_reminder_count: nextCount,
    };

    let disabled = false;
    if (nextCount >= MAX_UNPAID_PAYMENT_REMINDERS_BEFORE_DISABLE) {
      disabled = true;
      patch.status = RECURRING_SUBSCRIPTION_DISABLED_STATUS;
      patch.stripe_billing_reason = RECURRING_SUBSCRIPTION_DISABLED_REASON;
      this.logger.warn(
        `Recurring subscription ${subscriptionId} disabled after ${nextCount} unpaid payment reminders`,
      );
    }

    await this.recurringDonationRepo.update(subscriptionId, patch);
    return { count: nextCount, disabled };
  }

  /** Reset reminder streak when donor pays an installment / initial donation. */
  async resetUnpaidPaymentReminderCount(subscriptionId: number): Promise<void> {
    await this.recurringDonationRepo.update(subscriptionId, {
      unpaid_payment_reminder_count: 0,
    });
  }

  /**
   * Manual send of the same installment payment link the cron uses
   * (donation failure/paylink email + abandon WhatsApp).
   * Non-Stripe subscriptions only.
   */
  async sendInstallmentPaymentLink(subscriptionId: number): Promise<{
    donation_id: number;
    email_sent: boolean;
    whatsapp_sent: boolean;
    pending_installment_count: number;
    errors: string[];
  }> {
    const subscription = await this.recurringDonationRepo.findOne({
      where: {
        id: subscriptionId,
        record_type: "subscription",
        is_archived: false,
      },
    });
    if (!subscription) {
      throw new NotFoundException("Recurring donation subscription not found");
    }
    if (subscription.stripe_subscription_id) {
      throw new BadRequestException(
        "Stripe subscriptions are charged automatically — no manual installment link",
      );
    }

    // --- ENABLE LATER: block manual link if 3 unpaid reminders already sent ---
    // if (await this.isSubscriptionBlockedByUnpaidReminders(subscriptionId)) {
    //   throw new BadRequestException(
    //     `Recurring subscription is disabled after ${MAX_UNPAID_PAYMENT_REMINDERS_BEFORE_DISABLE} unpaid payment reminders`,
    //   );
    // }
    // --- END ENABLE LATER ---

    if (!subscription.donor_id) {
      throw new BadRequestException("Subscription has no donor linked");
    }

    const dues = await this.ensurePeriodDuesForSubscription(subscription);

    const donor = await this.donorRepository.findOne({
      where: { id: subscription.donor_id },
    });
    if (!donor) {
      throw new BadRequestException("Donor not found");
    }
    if (!donor.email && !donor.phone) {
      throw new BadRequestException("Donor has no email or phone");
    }

    const donation = await this.resolveOrCreateInstallmentLinkDonation(
      subscription,
      donor,
    );
    if (!donation?.id) {
      throw new BadRequestException(
        "Could not create or find a pending donation for the payment link",
      );
    }

    const donorName =
      donor.name ||
      donor.first_name ||
      donor.email ||
      `Donor #${donor.id}`;
    const amount =
      Number(subscription.amount) || Number(donation.amount) || 0;

    (donation as any).donor_name = donorName;
    (donation as any).donor = donor;

    const errors: string[] = [];
    let email_sent = false;
    let whatsapp_sent = false;

    if (donor.email) {
      try {
        email_sent =
          !!(await this.emailService.sendRecurringPaymentReminderEmail(
            donation,
            donor.email,
          ));
        if (!email_sent) errors.push("Payment link email failed");
      } catch (err: any) {
        errors.push(err?.message || "Payment link email failed");
      }
    }

    if (donor.phone) {
      try {
        whatsapp_sent = !!(await this.whatsAppService.sendRecurringPaymentReminder({
          phoneNumber: donor.phone,
          amount: String(amount),
          donationId: donation.id,
        }));
        if (!whatsapp_sent) errors.push("Payment link WhatsApp failed");
      } catch (err: any) {
        errors.push(err?.message || "Payment link WhatsApp failed");
      }
    }

    if (!email_sent && !whatsapp_sent) {
      throw new BadRequestException(
        errors.join("; ") || "Failed to send installment payment link",
      );
    }

    // --- ENABLE LATER: count reminder toward auto-disable after 3 unpaid ---
    // await this.recordUnpaidPaymentReminderSent(subscriptionId);
    // --- END ENABLE LATER ---

    return {
      donation_id: donation.id,
      email_sent,
      whatsapp_sent,
      pending_installment_count: dues.pending_count,
      errors,
    };
  }

  /**
   * Admin: mark selected pending installment dues as paid.
   * Does not delete donors/donations; does not create donations.
   */
  async markInstallmentsPaid(
    subscriptionId: number,
    opts: { installmentIds: number[]; note?: string },
  ): Promise<{
    marked: number;
    installment_ids: number[];
    pending_remaining: number;
  }> {
    const ids = [
      ...new Set(
        (opts.installmentIds || [])
          .map((n) => Number(n))
          .filter((n) => Number.isFinite(n) && n > 0),
      ),
    ];
    if (!ids.length) {
      throw new BadRequestException("Select at least one installment");
    }

    const subscription = await this.recurringDonationRepo.findOne({
      where: {
        id: subscriptionId,
        record_type: "subscription",
        is_archived: false,
      },
    });
    if (!subscription) {
      throw new NotFoundException("Recurring donation subscription not found");
    }
    if (subscription.stripe_subscription_id) {
      throw new BadRequestException(
        "Stripe installments are settled via Stripe webhooks",
      );
    }

    const rows = await this.recurringDonationRepo
      .createQueryBuilder("inst")
      .where("inst.id IN (:...ids)", { ids })
      .andWhere("inst.parent_id = :parentId", { parentId: subscriptionId })
      .andWhere("inst.record_type = :type", { type: "installment" })
      .andWhere("inst.is_archived = false")
      .getMany();

    if (!rows.length) {
      throw new BadRequestException(
        "No matching installments found for this subscription",
      );
    }

    const pendingRows = rows.filter(
      (r) => String(r.status || "").toLowerCase() === "pending",
    );
    if (!pendingRows.length) {
      throw new BadRequestException(
        "Selected installments are already paid (or not pending)",
      );
    }

    const paidAt = new Date();
    const noteSuffix = opts.note
      ? String(opts.note).trim().slice(0, 120)
      : "";

    for (const row of pendingRows) {
      await this.recurringDonationRepo.update(row.id, {
        status: "completed",
        paid_at: paidAt,
        stripe_invoice_id: `manual-mark-${row.id}`,
        stripe_billing_reason: noteSuffix
          ? `manual_mark_paid:${noteSuffix}`
          : "manual_mark_paid",
      });
    }

    if (subscription.status !== "active") {
      await this.recurringDonationRepo.update(subscription.id, {
        status: "active",
      });
    }

    // --- ENABLE LATER: admin marked paid — reset unpaid reminder streak ---
    // await this.resetUnpaidPaymentReminderCount(subscriptionId);
    // --- END ENABLE LATER ---

    const pending_remaining = await this.recurringDonationRepo
      .createQueryBuilder("inst")
      .where("inst.parent_id = :parentId", { parentId: subscriptionId })
      .andWhere("inst.record_type = :type", { type: "installment" })
      .andWhere("inst.is_archived = false")
      .andWhere("LOWER(COALESCE(inst.status, '')) = :status", {
        status: "pending",
      })
      .getCount();

    return {
      marked: pendingRows.length,
      installment_ids: pendingRows.map((r) => r.id),
      pending_remaining,
    };
  }

  /**
   * Resolve the exact pending donation for this subscription's installment link.
   * Prefer initial_donation_id when still pending/failed; else a donation tagged
   * to this subscription id. Never pick an unrelated pending donation for the donor.
   */
  async resolveOrCreateInstallmentLinkDonation(
    subscription: RecurringDonation,
    donor?: Donor | null,
  ): Promise<Donation | null> {
    const marker = `subscription #${subscription.id}`;

    // 1) Initial donation for this subscription, if still unpaid
    if (subscription.initial_donation_id) {
      const initial = await this.donationRepository.findOne({
        where: { id: subscription.initial_donation_id, is_archived: false },
        relations: ["donor"],
      });
      if (initial) {
        const status = String(initial.status || "").toLowerCase();
        if (status === "pending" || status === "failed") {
          return initial;
        }
      }
    }

    // 2) Existing pending/failed donation created for THIS subscription only
    const tagged = await this.donationRepository
      .createQueryBuilder("d")
      .leftJoinAndSelect("d.donor", "donor")
      .where("d.donor_id = :donorId", { donorId: subscription.donor_id })
      .andWhere("d.status IN (:...statuses)", {
        statuses: ["pending", "failed"],
      })
      .andWhere("d.is_archived = false")
      .andWhere(
        `(d.note ILIKE :marker OR d.manual_recurring_intent->>'recurring_subscription_id' = :subId)`,
        { marker: `%${marker}%`, subId: String(subscription.id) },
      )
      .orderBy("d.id", "DESC")
      .getOne();
    if (tagged) return tagged;

    // 3) Create a new pending donation dedicated to this subscription
    const amount = Number(subscription.amount) || 0;
    if (amount <= 0) return null;

    let donorRow = donor;
    if (!donorRow && subscription.donor_id) {
      donorRow = await this.donorRepository.findOne({
        where: { id: subscription.donor_id },
      });
    }

    const created = this.donationRepository.create({
      donor_id: subscription.donor_id,
      campaign_id: subscription.campaign_id ?? null,
      project_id: subscription.project_id ?? null,
      amount,
      currency: subscription.currency || "PKR",
      donation_type: subscription.donation_type || "general",
      donation_method: subscription.donation_method || "online",
      donation_source: "recurring_ledger_reminder",
      status: "pending",
      note: `Installment payment link for ${marker}`,
      manual_recurring_intent: {
        recurring_subscription_id: subscription.id,
        installment_link: true,
      },
    });
    const saved = await this.donationRepository.save(created);
    if (donorRow) saved.donor = donorRow;
    return saved;
  }
}
