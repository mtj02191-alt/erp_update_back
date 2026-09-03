import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { ConfigService } from "@nestjs/config";
import { In, Repository } from "typeorm";
import { ManualRecurringPledge } from "./entities/manual-recurring-pledge.entity";
import { ManualRecurringStatus } from "./utils/manual-recurring.constants";
import {
  formatPledgeItemsSummary,
  formatPrepaidCoverageLabel,
  isPrepaidPeriodCovered,
} from "./utils/manual-recurring-pledge.util";
import {
  formatPeriodKeyLabel,
  getDueReminderFrequencies,
  getPeriodBoundsForFrequency,
  getPeriodKeyForFrequency,
  getReminderDedupeKey,
} from "./utils/manual-recurring-period.util";
import {
  resolveChunkDelayMs,
  resolveChunkSize,
  resolveMaxDetails,
  sleep,
} from "./utils/manual-recurring-chunk.util";
import { Donation } from "../../donations/entities/donation.entity";
import { RecurringDonation } from "../../donations/recurring_donations/entities/recurring-donation.entity";
import { EmailTemplateService } from "../email_template/email_template.service";
import { EmailService } from "../../email/email.service";
import { WhatsAppService } from "../../utils/services/whatsapp.service";
import { Campaign, CampaignStatus } from "../campaigns/entities/campaign.entity";
import { ProcessManualRecurringRemindersDto } from "./dto/manual-recurring-filters.dto";
import {
  CampaignTemplateSlot,
  getSlotTemplateId,
  isSlotEnabled,
  SLOT_TO_TEMPLATE_PURPOSE,
} from "../campaigns/utils/campaign-communication.constants";
import { CampaignTargetFrequency } from "../campaigns/utils/campaign-recurring.constants";
import { RecurringDonationsLedgerService } from "../../donations/recurring_donations/recurring-donations-ledger.service";
import {
  getMonthlyEarlyReminderDedupeKey,
  getPktDateString,
  getPktYmdPlusDays,
  isSubscriptionBillingDayToday,
  isSubscriptionEarlyBillingReminderDayToday,
  MONTHLY_EARLY_REMINDER_DAYS,
  resolveMonthlyPeriodKeyForBillingYmd,
} from "../../donations/recurring_donations/recurring-billing-date.util";
import { isSubscriptionPrepaidPeriodCovered } from "../../donations/recurring_donations/recurring-prepaid.util";

export interface ManualRecurringReminderDetail {
  pledge_id: number;
  donor_id: number;
  donor_name: string;
  campaign_id: number;
  campaign_title: string;
  action: string;
  channels?: string[];
  error?: string;
}

export interface ManualRecurringReminderResult {
  frequency: string;
  period_key: string;
  period_label: string;
  scanned: number;
  skipped_donated: number;
  skipped_stripe_auto: number;
  skipped_no_contact: number;
  skipped_already_reminded: number;
  skipped_already_thanked: number;
  skipped_unsubscribed: number;
  skipped_inactive_donor: number;
  skipped_campaign_disabled: number;
  skipped_prepaid_covered: number;
  reminders_sent: number;
  thanks_sent: number;
  reminders_failed: number;
  thanks_failed: number;
  would_send_count: number;
  would_thank_count: number;
  dry_run: boolean;
  chunk_size: number;
  chunks_processed: number;
  details_truncated: boolean;
  details: ManualRecurringReminderDetail[];
}

export interface ManualRecurringReminderBatchResult {
  dry_run: boolean;
  frequencies: string[];
  period_key: string;
  period_label: string;
  scanned: number;
  reminders_sent: number;
  thanks_sent: number;
  reminders_failed: number;
  thanks_failed: number;
  would_send_count: number;
  would_thank_count: number;
  skipped_donated: number;
  runs: ManualRecurringReminderResult[];
}

@Injectable()
export class ManualRecurringReminderService {
  private readonly logger = new Logger(ManualRecurringReminderService.name);

  constructor(
    @InjectRepository(ManualRecurringPledge)
    private readonly pledgeRepo: Repository<ManualRecurringPledge>,
    @InjectRepository(Donation)
    private readonly donationRepo: Repository<Donation>,
    @InjectRepository(RecurringDonation)
    private readonly stripeRecurringRepo: Repository<RecurringDonation>,
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    private readonly emailTemplateService: EmailTemplateService,
    private readonly emailService: EmailService,
    private readonly whatsAppService: WhatsAppService,
    private readonly configService: ConfigService,
    private readonly recurringLedgerService: RecurringDonationsLedgerService,
  ) {}

  /**
   * Backward-compatible entry: monthly campaigns only (or explicit frequency).
   * Prefer processDueReminders() from cron.
   */
  async processMonthlyReminders(
    options: ProcessManualRecurringRemindersDto = {},
  ): Promise<ManualRecurringReminderResult | ManualRecurringReminderBatchResult> {
    if (options.frequency) {
      return this.processRemindersForFrequency(
        options.frequency as CampaignTargetFrequency,
        options,
      );
    }
    if (options.run_due === true) {
      return this.processDueReminders(options);
    }
    return this.processRemindersForFrequency(
      CampaignTargetFrequency.MONTHLY,
      options,
    );
  }

  /** Run all frequencies that are due today (PKT). */
  async processDueReminders(
    options: ProcessManualRecurringRemindersDto = {},
  ): Promise<ManualRecurringReminderBatchResult> {
    const frequencies = getDueReminderFrequencies();
    const runs: ManualRecurringReminderResult[] = [];
    for (const frequency of frequencies) {
      runs.push(await this.processRemindersForFrequency(frequency, options));
    }
    try {
      await this.processNonStripeLedgerReminders(options);
    } catch (err: any) {
      this.logger.error(
        `Non-Stripe ledger reminders failed: ${err?.message || err}`,
      );
    }
    return this.aggregateRuns(runs, options.dry_run === true);
  }

  async processRemindersForFrequency(
    frequency: CampaignTargetFrequency,
    options: ProcessManualRecurringRemindersDto = {},
  ): Promise<ManualRecurringReminderResult> {
    const periodKey =
      options.period_key || getPeriodKeyForFrequency(frequency);
    const reminderDedupeKey = getReminderDedupeKey(frequency, periodKey);
    const dryRun = options.dry_run === true;
    const force = options.force === true;
    const chunkSize = options.chunk_size || resolveChunkSize(this.configService);
    const chunkDelayMs = resolveChunkDelayMs(this.configService);
    const includeDetails = options.include_details === true;
    const maxDetails = resolveMaxDetails(includeDetails, this.configService);

    const periodBounds = options.period_key
      ? this.resolvePeriodBoundsFromKey(frequency, options.period_key)
      : getPeriodBoundsForFrequency(frequency);

    const stripeAutoDonorIds = await this.getStripeAutoDonorIds();
    const purposeFallbackCache = new Map<string, number | null>();

    const result: ManualRecurringReminderResult = {
      frequency,
      period_key: periodKey,
      period_label: formatPeriodKeyLabel(periodKey),
      scanned: 0,
      skipped_donated: 0,
      skipped_stripe_auto: 0,
      skipped_no_contact: 0,
      skipped_already_reminded: 0,
      skipped_already_thanked: 0,
      skipped_unsubscribed: 0,
      skipped_inactive_donor: 0,
      skipped_campaign_disabled: 0,
      skipped_prepaid_covered: 0,
      reminders_sent: 0,
      thanks_sent: 0,
      reminders_failed: 0,
      thanks_failed: 0,
      would_send_count: 0,
      would_thank_count: 0,
      dry_run: dryRun,
      chunk_size: chunkSize,
      chunks_processed: 0,
      details_truncated: false,
      details: [],
    };

    let lastPledgeId = 0;
    let hasMore = true;

    while (hasMore) {
      const pledges = await this.pledgeRepo
        .createQueryBuilder("pledge")
        .innerJoinAndSelect("pledge.donor", "donor")
        .innerJoinAndSelect("pledge.campaign", "campaign")
        .leftJoinAndSelect("pledge.lines", "lines")
        .leftJoinAndSelect("lines.campaign_item", "campaign_item")
        .where("pledge.status = :status", {
          status: ManualRecurringStatus.ACTIVE,
        })
        .andWhere("pledge.is_archived = false")
        .andWhere("pledge.id > :lastPledgeId", { lastPledgeId })
        .andWhere("campaign.is_recurring = true")
        .andWhere("campaign.monthly_donor_automation_enabled = true")
        .andWhere("campaign.target_frequency = :frequency", { frequency })
        .andWhere("campaign.status = :campaignStatus", {
          campaignStatus: CampaignStatus.ACTIVE,
        })
        .orderBy("pledge.id", "ASC")
        .take(chunkSize)
        .getMany();

      if (!pledges.length) break;

      result.chunks_processed += 1;
      result.scanned += pledges.length;
      lastPledgeId = pledges[pledges.length - 1].id;
      hasMore = pledges.length === chunkSize;

      const donatedLookup = await this.buildDonatedLookupForChunk(
        pledges,
        periodBounds.start,
        periodBounds.end,
      );

      const remindedUpdates: { id: number; key: string }[] = [];
      const thankedUpdates: { id: number; key: string }[] = [];

      for (const pledge of pledges) {
        const outcome = await this.processOnePledge({
          pledge,
          periodKey,
          reminderDedupeKey,
          frequency,
          periodStart: periodBounds.start,
          periodEnd: periodBounds.end,
          dryRun,
          force,
          stripeAutoDonorIds,
          donatedLookup,
          purposeFallbackCache,
        });

        result.skipped_donated += outcome.skipped_donated;
        result.skipped_stripe_auto += outcome.skipped_stripe_auto;
        result.skipped_no_contact += outcome.skipped_no_contact;
        result.skipped_already_reminded += outcome.skipped_already_reminded;
        result.skipped_already_thanked += outcome.skipped_already_thanked;
        result.skipped_unsubscribed += outcome.skipped_unsubscribed;
        result.skipped_inactive_donor += outcome.skipped_inactive_donor;
        result.skipped_campaign_disabled += outcome.skipped_campaign_disabled;
        result.skipped_prepaid_covered += outcome.skipped_prepaid_covered;
        result.reminders_sent += outcome.reminders_sent;
        result.thanks_sent += outcome.thanks_sent;
        result.reminders_failed += outcome.reminders_failed;
        result.thanks_failed += outcome.thanks_failed;
        result.would_send_count += outcome.would_send;
        result.would_thank_count += outcome.would_thank;

        if (outcome.markReminded) {
          remindedUpdates.push({ id: pledge.id, key: reminderDedupeKey });
        }
        if (outcome.markThanked) {
          thankedUpdates.push({ id: pledge.id, key: periodKey });
        }

        if (outcome.detail) {
          this.appendDetail(result, outcome.detail, maxDetails);
        }
      }

      if (!dryRun) {
        for (const row of remindedUpdates) {
          await this.pledgeRepo.update(
            { id: row.id },
            {
              last_reminder_period_key: row.key,
              last_reminder_sent_at: new Date(),
            },
          );
        }
        for (const row of thankedUpdates) {
          await this.pledgeRepo.update(
            { id: row.id },
            {
              last_thanks_period_key: row.key,
              last_thanks_sent_at: new Date(),
            },
          );
        }
      }

      this.logger.log(
        `Recurring campaign chunk #${result.chunks_processed} [${frequency}] (${periodKey}) — batch: ${pledges.length}, reminders: ${result.reminders_sent}, thanks: ${result.thanks_sent}`,
      );

      if (hasMore && chunkDelayMs > 0) {
        await sleep(chunkDelayMs);
      }
    }

    this.logger.log(
      `Recurring campaign job [${frequency}] (${periodKey}) — scanned: ${result.scanned}, reminders: ${result.reminders_sent}, thanks: ${result.thanks_sent}, dryRun: ${dryRun}`,
    );

    return result;
  }

  private aggregateRuns(
    runs: ManualRecurringReminderResult[],
    dryRun: boolean,
  ): ManualRecurringReminderBatchResult {
    const sum = (key: keyof ManualRecurringReminderResult) =>
      runs.reduce((acc, r) => acc + (Number(r[key]) || 0), 0);
    return {
      dry_run: dryRun,
      frequencies: runs.map((r) => r.frequency),
      period_key: runs.map((r) => `${r.frequency}:${r.period_key}`).join(", "),
      period_label: runs.map((r) => r.period_label).join(" | "),
      scanned: sum("scanned"),
      reminders_sent: sum("reminders_sent"),
      thanks_sent: sum("thanks_sent"),
      reminders_failed: sum("reminders_failed"),
      thanks_failed: sum("thanks_failed"),
      would_send_count: sum("would_send_count"),
      would_thank_count: sum("would_thank_count"),
      skipped_donated: sum("skipped_donated"),
      runs,
    };
  }

  private resolvePeriodBoundsFromKey(
    frequency: CampaignTargetFrequency,
    periodKey: string,
  ) {
    if (frequency === CampaignTargetFrequency.MONTHLY && /^\d{4}-\d{2}$/.test(periodKey)) {
      return getPeriodBoundsForFrequency(
        frequency,
        new Date(`${periodKey}-15T12:00:00`),
      );
    }
    if (
      frequency === CampaignTargetFrequency.DAILY &&
      /^\d{4}-\d{2}-\d{2}$/.test(periodKey)
    ) {
      return getPeriodBoundsForFrequency(
        frequency,
        new Date(`${periodKey}T12:00:00`),
      );
    }
    if (
      frequency === CampaignTargetFrequency.WEEKLY &&
      /^\d{4}-\d{2}-\d{2}_\d{4}-\d{2}-\d{2}$/.test(periodKey)
    ) {
      const start = periodKey.split("_")[0];
      return getPeriodBoundsForFrequency(
        frequency,
        new Date(`${start}T12:00:00`),
      );
    }
    return getPeriodBoundsForFrequency(frequency);
  }

  private appendDetail(
    result: ManualRecurringReminderResult,
    detail: ManualRecurringReminderDetail,
    maxDetails: number,
  ) {
    if (result.details.length >= maxDetails) {
      result.details_truncated = true;
      return;
    }
    result.details.push(detail);
  }

  private async processOnePledge(params: {
    pledge: ManualRecurringPledge;
    periodKey: string;
    reminderDedupeKey: string;
    frequency: CampaignTargetFrequency;
    periodStart: Date;
    periodEnd: Date;
    dryRun: boolean;
    force: boolean;
    stripeAutoDonorIds: Set<number>;
    donatedLookup: Map<number, Set<number>>;
    purposeFallbackCache: Map<string, number | null>;
  }) {
    const {
      pledge,
      periodKey,
      reminderDedupeKey,
      frequency,
      periodStart,
      periodEnd,
      dryRun,
      force,
      stripeAutoDonorIds,
      donatedLookup,
      purposeFallbackCache,
    } = params;

    const campaign = pledge.campaign;
    const donor = pledge.donor;
    const donorName =
      donor?.name || donor?.email || `Donor #${pledge.donor_id}`;
    const campaignTitle = campaign?.title || `Campaign #${pledge.campaign_id}`;

    const baseDetail = {
      pledge_id: pledge.id,
      donor_id: pledge.donor_id,
      donor_name: donorName,
      campaign_id: pledge.campaign_id,
      campaign_title: campaignTitle,
    };

    const zero = {
      skipped_donated: 0,
      skipped_stripe_auto: 0,
      skipped_no_contact: 0,
      skipped_already_reminded: 0,
      skipped_already_thanked: 0,
      skipped_unsubscribed: 0,
      skipped_inactive_donor: 0,
      skipped_campaign_disabled: 0,
      skipped_prepaid_covered: 0,
      reminders_sent: 0,
      thanks_sent: 0,
      reminders_failed: 0,
      thanks_failed: 0,
      would_send: 0,
      would_thank: 0,
      markReminded: false,
      markThanked: false,
    };

    if (
      !campaign?.is_recurring ||
      !campaign.monthly_donor_automation_enabled ||
      campaign.status !== CampaignStatus.ACTIVE
    ) {
      return {
        ...zero,
        skipped_campaign_disabled: 1,
        detail: { ...baseDetail, action: "skipped_campaign_automation_off" },
      };
    }

    if (!donor || donor.is_archived || donor.is_active === false) {
      return {
        ...zero,
        skipped_inactive_donor: 1,
        detail: { ...baseDetail, action: "skipped_inactive_donor" },
      };
    }

    if (donor.notification_subscription === false) {
      return {
        ...zero,
        skipped_unsubscribed: 1,
        detail: { ...baseDetail, action: "skipped_unsubscribed" },
      };
    }

    if (stripeAutoDonorIds.has(pledge.donor_id)) {
      return {
        ...zero,
        skipped_stripe_auto: 1,
        detail: { ...baseDetail, action: "skipped_stripe_auto_recurring" },
      };
    }

    const hasDonated = this.hasDonatedForCampaign(
      pledge.campaign_id,
      pledge.donor_id,
      donatedLookup,
    );

    if (!hasDonated && frequency === CampaignTargetFrequency.MONTHLY && isPrepaidPeriodCovered(pledge, periodKey)) {
      return {
        ...zero,
        skipped_prepaid_covered: 1,
        detail: {
          ...baseDetail,
          action: "skipped_prepaid_covered_month",
        },
      };
    }

    if (hasDonated) {
      return this.handleDonatedDonor({
        pledge,
        campaign,
        donor,
        periodKey,
        periodStart,
        periodEnd,
        dryRun,
        force,
        baseDetail,
        purposeFallbackCache,
      });
    }

    return this.handleNotDonatedDonor({
      pledge,
      campaign,
      donor,
      periodKey,
      reminderDedupeKey,
      dryRun,
      force,
      baseDetail,
      purposeFallbackCache,
    });
  }

  private async handleDonatedDonor(params: {
    pledge: ManualRecurringPledge;
    campaign: Campaign;
    donor: ManualRecurringPledge["donor"];
    periodKey: string;
    periodStart: Date;
    periodEnd: Date;
    dryRun: boolean;
    force: boolean;
    baseDetail: Omit<ManualRecurringReminderDetail, "action">;
    purposeFallbackCache: Map<string, number | null>;
  }) {
    const zero = {
      skipped_donated: 1,
      skipped_stripe_auto: 0,
      skipped_no_contact: 0,
      skipped_already_reminded: 0,
      skipped_already_thanked: 0,
      skipped_unsubscribed: 0,
      skipped_inactive_donor: 0,
      skipped_campaign_disabled: 0,
      skipped_prepaid_covered: 0,
      reminders_sent: 0,
      thanks_sent: 0,
      reminders_failed: 0,
      thanks_failed: 0,
      would_send: 0,
      would_thank: 0,
      markReminded: false,
      markThanked: false,
    };

    const useDefaults = this.shouldUseDonationViewDefaults(
      params.campaign,
      "thanks",
    );

    if (
      !params.force &&
      params.pledge.last_thanks_period_key === params.periodKey
    ) {
      return {
        ...zero,
        skipped_already_thanked: 1,
        detail: {
          ...params.baseDetail,
          action: "skipped_already_thanked",
        },
      };
    }

    const channels = this.resolveChannels(params.pledge, params.donor);
    if (!channels.length) {
      return {
        ...zero,
        skipped_no_contact: 1,
        detail: { ...params.baseDetail, action: "skipped_no_contact" },
      };
    }

    if (params.dryRun) {
      return {
        ...zero,
        skipped_donated: 0,
        would_thank: 1,
        detail: {
          ...params.baseDetail,
          action: useDefaults
            ? "would_send_thanks_default"
            : "would_send_thanks",
          channels,
        },
      };
    }

    const sendResult = useDefaults
      ? await this.sendDefaultThanksMessages({
          pledge: params.pledge,
          campaign: params.campaign,
          donor: params.donor,
          channels,
          periodStart: params.periodStart,
          periodEnd: params.periodEnd,
        })
      : await this.sendSlotMessages({
          pledge: params.pledge,
          campaign: params.campaign,
          donorId: params.pledge.donor_id,
          slot: "thanks",
          channels,
          periodKey: params.periodKey,
          purposeFallbackCache: params.purposeFallbackCache,
        });

    if (sendResult.sent > 0) {
      return {
        ...zero,
        skipped_donated: 0,
        thanks_sent: 1,
        markThanked: true,
        thanks_failed: sendResult.failed > 0 ? 1 : 0,
        detail: {
          ...params.baseDetail,
          action: useDefaults ? "thanks_sent_default" : "thanks_sent",
          channels,
          error: sendResult.errors.join("; ") || undefined,
        },
      };
    }

    return {
      ...zero,
      skipped_donated: 0,
      thanks_failed: 1,
      detail: {
        ...params.baseDetail,
        action: "thanks_failed",
        channels,
        error: sendResult.errors.join("; ") || "Send failed",
      },
    };
  }

  private async handleNotDonatedDonor(params: {
    pledge: ManualRecurringPledge;
    campaign: Campaign;
    donor: ManualRecurringPledge["donor"];
    periodKey: string;
    reminderDedupeKey: string;
    dryRun: boolean;
    force: boolean;
    baseDetail: Omit<ManualRecurringReminderDetail, "action">;
    purposeFallbackCache: Map<string, number | null>;
  }) {
    const zero = {
      skipped_donated: 0,
      skipped_stripe_auto: 0,
      skipped_no_contact: 0,
      skipped_already_reminded: 0,
      skipped_already_thanked: 0,
      skipped_unsubscribed: 0,
      skipped_inactive_donor: 0,
      skipped_campaign_disabled: 0,
      skipped_prepaid_covered: 0,
      reminders_sent: 0,
      thanks_sent: 0,
      reminders_failed: 0,
      thanks_failed: 0,
      would_send: 0,
      would_thank: 0,
      markReminded: false,
      markThanked: false,
    };

    if (
      !params.force &&
      params.pledge.last_reminder_period_key === params.reminderDedupeKey
    ) {
      return {
        ...zero,
        skipped_already_reminded: 1,
        detail: {
          ...params.baseDetail,
          action: "skipped_already_reminded",
        },
      };
    }

    const channels = this.resolveChannels(params.pledge, params.donor);
    if (!channels.length) {
      return {
        ...zero,
        skipped_no_contact: 1,
        detail: { ...params.baseDetail, action: "skipped_no_contact" },
      };
    }

    if (params.dryRun) {
      return {
        ...zero,
        would_send: 1,
        detail: {
          ...params.baseDetail,
          action: "would_send_reminder_default",
          channels,
        },
      };
    }

    // Recurring payment reminders always use the dedicated reminder email +
    // eOcean WhatsApp template — not campaign slot templates.
    const sendResult = await this.sendDefaultPaymentLinkMessages({
      pledge: params.pledge,
      campaign: params.campaign,
      donor: params.donor,
      channels,
    });

    if (sendResult.sent > 0) {
      return {
        ...zero,
        reminders_sent: 1,
        markReminded: true,
        reminders_failed: sendResult.failed > 0 ? 1 : 0,
        detail: {
          ...params.baseDetail,
          action: "reminder_sent_default",
          channels,
          error: sendResult.errors.join("; ") || undefined,
        },
      };
    }

    return {
      ...zero,
      reminders_failed: 1,
      detail: {
        ...params.baseDetail,
        action: "reminder_failed",
        channels,
        error: sendResult.errors.join("; ") || "Send failed",
      },
    };
  }

  private resolveChannels(
    pledge: ManualRecurringPledge,
    donor: ManualRecurringPledge["donor"],
  ): ("email" | "whatsapp")[] {
    const channels: ("email" | "whatsapp")[] = [];
    if (pledge.remind_via_email && donor?.email) channels.push("email");
    if (pledge.remind_via_whatsapp && donor?.phone) channels.push("whatsapp");
    return channels;
  }

  /**
   * Use donation-view communication actions (thanks / payment-link) when:
   * - no campaign assigned, or
   * - campaign opted into default thanks/reminders, or
   * - the slot has no custom campaign templates enabled
   */
  private shouldUseDonationViewDefaults(
    campaign: Campaign | null | undefined,
    slot: CampaignTemplateSlot,
  ): boolean {
    if (!campaign?.id) return true;
    if (campaign.use_default_thanks_and_reminders === true) return true;
    if (!isSlotEnabled(campaign.communication_templates, slot)) return true;
    return false;
  }

  private donorDisplayName(donor: ManualRecurringPledge["donor"]): string {
    return (
      donor?.name ||
      (donor as any)?.first_name ||
      "Valued Donor"
    );
  }

  private pledgeAmountInt(
    pledge: ManualRecurringPledge,
    campaign?: Campaign | null,
  ): number {
    const fromPledge = Number(pledge.pledged_amount);
    if (Number.isFinite(fromPledge) && fromPledge > 0) {
      return Math.round(fromPledge);
    }
    const fromGoal = Number(campaign?.goal_amount);
    if (Number.isFinite(fromGoal) && fromGoal > 0) {
      return Math.round(fromGoal);
    }
    return 0;
  }

  /** Existing donation thanks email + eOcean donation_confirmation_new WhatsApp. */
  private async sendDefaultThanksMessages(params: {
    pledge: ManualRecurringPledge;
    campaign?: Campaign | null;
    donor: ManualRecurringPledge["donor"];
    channels: ("email" | "whatsapp")[];
    periodStart: Date;
    periodEnd: Date;
  }): Promise<{ sent: number; failed: number; errors: string[] }> {
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    const donation = await this.findPaidDonationForPeriod(
      params.pledge,
      params.campaign ?? null,
      params.periodStart,
      params.periodEnd,
    );
    if (!donation) {
      return {
        sent: 0,
        failed: params.channels.length,
        errors: ["No paid donation found in period for default thanks"],
      };
    }

    const donor = params.donor;
    const donorName = this.donorDisplayName(donor);
    const amount =
      donation.paid_amount ||
      donation.amount ||
      this.pledgeAmountInt(params.pledge, params.campaign);

    for (const channel of params.channels) {
      try {
        if (channel === "email") {
          if (!donor?.email) {
            errors.push("No donor email for thanks");
            failed += 1;
            continue;
          }
          // Already thanked on payment — do not send again
          if (donation.email_sent === true) {
            sent += 1;
            continue;
          }
          const ok = await this.emailService.sendDonationSuccessEmail(
            donation,
            donor,
            donor.email,
          );
          if (ok) {
            sent += 1;
            await this.donationRepo.update(donation.id, { email_sent: true });
            donation.email_sent = true;
          } else {
            failed += 1;
            errors.push("Thanks email failed");
          }
        } else {
          if (!donor?.phone) {
            errors.push("No donor phone for thanks");
            failed += 1;
            continue;
          }
          if (donation.message_sent === true) {
            sent += 1;
            continue;
          }
          const ok = await this.whatsAppService.sendRecurringConfirmation({
            phoneNumber: donor.phone,
            amount: String(amount),
          });
          if (ok) {
            sent += 1;
            await this.donationRepo.update(donation.id, { message_sent: true });
            donation.message_sent = true;
          } else {
            failed += 1;
            errors.push("Thanks WhatsApp failed");
          }
        }
      } catch (err: any) {
        failed += 1;
        errors.push(err?.message || `Thanks ${channel} failed`);
      }
    }

    return { sent, failed, errors };
  }

  /**
   * Existing payment-link email + eOcean donation_payment_reminder_new WhatsApp.
   * Reuses a pending donation for the pledge/campaign or creates one.
   */
  private async sendDefaultPaymentLinkMessages(params: {
    pledge: ManualRecurringPledge;
    campaign?: Campaign | null;
    donor: ManualRecurringPledge["donor"];
    channels: ("email" | "whatsapp")[];
  }): Promise<{ sent: number; failed: number; errors: string[] }> {
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    const donation = await this.resolveOrCreatePendingDonation(
      params.pledge,
      params.campaign ?? null,
      params.donor,
    );
    if (!donation?.id) {
      return {
        sent: 0,
        failed: params.channels.length,
        errors: ["Could not resolve pending donation for payment link"],
      };
    }

    const donor = params.donor;
    const donorName = this.donorDisplayName(donor);
    const amount =
      donation.amount || this.pledgeAmountInt(params.pledge, params.campaign);

    // Failure/paylink email template reads donation.donor_name
    (donation as any).donor_name = donorName;
    (donation as any).donor = donor;

    for (const channel of params.channels) {
      try {
        if (channel === "email") {
          if (!donor?.email) {
            errors.push("No donor email for payment link");
            failed += 1;
            continue;
          }
          const ok =
            await this.emailService.sendRecurringPaymentReminderEmail(
              donation,
              donor.email,
            );
          if (ok) sent += 1;
          else {
            failed += 1;
            errors.push("Payment link email failed");
          }
        } else {
          if (!donor?.phone) {
            errors.push("No donor phone for payment link");
            failed += 1;
            continue;
          }
          const ok = await this.whatsAppService.sendRecurringPaymentReminder({
            phoneNumber: donor.phone,
            amount: String(amount),
            donationId: donation.id,
          });
          if (ok) sent += 1;
          else {
            failed += 1;
            errors.push("Payment link WhatsApp failed");
          }
        }
      } catch (err: any) {
        failed += 1;
        errors.push(err?.message || `Payment link ${channel} failed`);
      }
    }

    return { sent, failed, errors };
  }

  private async findPaidDonationForPeriod(
    pledge: ManualRecurringPledge,
    campaign: Campaign | null,
    periodStart: Date,
    periodEnd: Date,
  ): Promise<Donation | null> {
    const qb = this.donationRepo
      .createQueryBuilder("d")
      .leftJoinAndSelect("d.donor", "donor")
      .where("d.donor_id = :donorId", { donorId: pledge.donor_id })
      .andWhere("d.status IN (:...statuses)", {
        statuses: ["paid", "completed"],
      })
      .andWhere("d.date BETWEEN :start AND :end", {
        start: periodStart,
        end: periodEnd,
      })
      .orderBy("d.id", "DESC")
      .take(1);

    if (campaign?.id) {
      if (campaign.project_id != null) {
        qb.andWhere(
          "(d.campaign_id = :campaignId OR d.project_id = :projectId)",
          {
            campaignId: campaign.id,
            projectId: String(campaign.project_id),
          },
        );
      } else {
        qb.andWhere("d.campaign_id = :campaignId", { campaignId: campaign.id });
      }
    }

    return qb.getOne();
  }

  private async resolveOrCreatePendingDonation(
    pledge: ManualRecurringPledge,
    campaign: Campaign | null,
    donor: ManualRecurringPledge["donor"],
  ): Promise<Donation | null> {
    const qb = this.donationRepo
      .createQueryBuilder("d")
      .leftJoinAndSelect("d.donor", "donor")
      .where("d.donor_id = :donorId", { donorId: pledge.donor_id })
      .andWhere("d.status IN (:...statuses)", {
        statuses: ["pending", "failed"],
      })
      .orderBy("d.id", "DESC")
      .take(1);

    if (campaign?.id) {
      qb.andWhere("d.campaign_id = :campaignId", { campaignId: campaign.id });
    } else {
      qb.andWhere("d.campaign_id IS NULL");
    }

    const existing = await qb.getOne();
    if (existing) return existing;

    const amount = this.pledgeAmountInt(pledge, campaign);
    if (amount <= 0) {
      this.logger.warn(
        `Cannot create pending donation for pledge ${pledge.id}: no pledged/goal amount`,
      );
      return null;
    }

    const created = this.donationRepo.create({
      donor_id: pledge.donor_id,
      campaign_id: campaign?.id ?? null,
      ...(campaign?.project_id != null
        ? { project_id: String(campaign.project_id) }
        : {}),
      amount,
      currency: pledge.currency || campaign?.currency || "PKR",
      donation_type: campaign?.id ? "campaign" : "general",
      donation_method: "online",
      donation_source: "recurring_campaign_reminder",
      status: "pending",
      note: `Auto-created for recurring campaign reminder (pledge #${pledge.id})`,
    });
    const saved = await this.donationRepo.save(created);
    saved.donor = donor as any;
    return saved;
  }

  private async sendSlotMessages(params: {
    pledge: ManualRecurringPledge;
    campaign: Campaign;
    donorId: number;
    slot: CampaignTemplateSlot;
    channels: ("email" | "whatsapp")[];
    periodKey: string;
    purposeFallbackCache: Map<string, number | null>;
  }): Promise<{ sent: number; failed: number; errors: string[] }> {
    const overrides = await this.buildTemplateOverrides(
      params.pledge,
      params.campaign,
      params.periodKey,
    );
    let sent = 0;
    let failed = 0;
    const errors: string[] = [];

    for (const channel of params.channels) {
      const templateId = await this.resolveTemplateId(
        params.campaign,
        params.slot,
        channel,
        params.purposeFallbackCache,
      );
      if (!templateId) {
        errors.push(`No ${params.slot} ${channel} template on campaign`);
        failed += 1;
        continue;
      }

      const sendResult = await this.emailTemplateService.sendAutomatedToDonor({
        templateId,
        donorId: params.donorId,
        channel,
        overrides,
        metadata: {
          automated: true,
          job: "recurring_campaign_monthly",
          slot: params.slot,
          period_key: params.periodKey,
          pledge_id: params.pledge.id,
          campaign_id: params.campaign.id,
        },
      });

      if (sendResult.success) sent += 1;
      else {
        failed += 1;
        if (sendResult.error) errors.push(sendResult.error);
      }
    }

    return { sent, failed, errors };
  }

  private hasDonatedForCampaign(
    campaignId: number,
    donorId: number,
    donatedLookup: Map<number, Set<number>>,
  ): boolean {
    return donatedLookup.get(campaignId)?.has(donorId) ?? false;
  }

  private async buildDonatedLookupForChunk(
    pledges: ManualRecurringPledge[],
    start: Date,
    end: Date,
  ): Promise<Map<number, Set<number>>> {
    const lookup = new Map<number, Set<number>>();
    const byCampaign = new Map<number, { campaign: Campaign; donorIds: number[] }>();

    for (const pledge of pledges) {
      if (!pledge.campaign) continue;
      const entry = byCampaign.get(pledge.campaign_id) || {
        campaign: pledge.campaign,
        donorIds: [],
      };
      entry.donorIds.push(pledge.donor_id);
      byCampaign.set(pledge.campaign_id, entry);
    }

    for (const [campaignId, { campaign, donorIds }] of byCampaign) {
      const uniqueIds = [...new Set(donorIds)];
      lookup.set(
        campaignId,
        await this.getDonorIdsWithDonationForCampaign(
          uniqueIds,
          campaign,
          start,
          end,
        ),
      );
    }

    return lookup;
  }

  private async getDonorIdsWithDonationForCampaign(
    donorIds: number[],
    campaign: Campaign,
    start: Date,
    end: Date,
  ): Promise<Set<number>> {
    if (!donorIds.length) return new Set();

    const qb = this.donationRepo
      .createQueryBuilder("d")
      .select("DISTINCT d.donor_id", "donor_id")
      .where("d.donor_id IN (:...donorIds)", { donorIds })
      .andWhere("d.status IN (:...statuses)", {
        statuses: ["paid", "completed"],
      })
      .andWhere("d.date BETWEEN :start AND :end", { start, end });

    if (campaign.project_id != null) {
      qb.andWhere(
        "(d.campaign_id = :campaignId OR d.project_id = :projectId)",
        {
          campaignId: campaign.id,
          projectId: String(campaign.project_id),
        },
      );
    } else {
      qb.andWhere("d.campaign_id = :campaignId", { campaignId: campaign.id });
    }

    const rows = await qb.getRawMany();
    return new Set(rows.map((r) => Number(r.donor_id)).filter(Boolean));
  }

  private async getStripeAutoDonorIds(): Promise<Set<number>> {
    const rows = await this.stripeRecurringRepo
      .createQueryBuilder("rd")
      .select("DISTINCT rd.donor_id", "donor_id")
      .where("rd.record_type = :type", { type: "subscription" })
      .andWhere("rd.stripe_subscription_id IS NOT NULL")
      .andWhere("rd.status IN (:...statuses)", {
        statuses: ["active", "past_due", "trialing"],
      })
      .andWhere("rd.is_archived = false")
      .andWhere("rd.donor_id IS NOT NULL")
      .getRawMany();

    return new Set(rows.map((r) => Number(r.donor_id)).filter(Boolean));
  }

  /**
   * Remind / thank non-Stripe subscriptions in recurring_donations
   * (stripe_subscription_id IS NULL). Uses donation-view communication actions:
   * - not donated → payment link (failure email + abandon WhatsApp)
   * - donated → thanks (success email + payment confirmation WhatsApp)
   * Stripe auto-charge rows are skipped.
   */
  async processNonStripeLedgerReminders(
    options: ProcessManualRecurringRemindersDto = {},
  ): Promise<{
    scanned: number;
    reminders_sent: number;
    thanks_sent: number;
    skipped: number;
    failed: number;
    dry_run: boolean;
  }> {
    const dryRun = options.dry_run === true;
    const force = options.force === true;
    const frequencies = options.frequency
      ? [options.frequency as CampaignTargetFrequency]
      : getDueReminderFrequencies();

    let scanned = 0;
    let reminders_sent = 0;
    let thanks_sent = 0;
    let skipped = 0;
    let failed = 0;

    const intervalByFreq: Record<string, string> = {
      [CampaignTargetFrequency.DAILY]: "day",
      [CampaignTargetFrequency.WEEKLY]: "week",
      [CampaignTargetFrequency.MONTHLY]: "month",
    };

    const intervalsToProcess = new Set<string>();
    for (const frequency of frequencies) {
      const billingInterval = intervalByFreq[frequency];
      if (billingInterval) intervalsToProcess.add(billingInterval);
    }
    // Monthly ledger subs use each subscription's billing day, not only the 2nd-of-month cron
    intervalsToProcess.add("month");

    for (const billingInterval of intervalsToProcess) {
      const frequency =
        (Object.entries(intervalByFreq).find(
          ([, interval]) => interval === billingInterval,
        )?.[0] as CampaignTargetFrequency) ||
        CampaignTargetFrequency.MONTHLY;

      const defaultPeriodKey =
        options.period_key || getPeriodKeyForFrequency(frequency);
      const defaultPeriodBounds = options.period_key
        ? this.resolvePeriodBoundsFromKey(frequency, options.period_key)
        : getPeriodBoundsForFrequency(frequency);

      const rows = await this.stripeRecurringRepo
        .createQueryBuilder("rd")
        .where("rd.record_type = :type", { type: "subscription" })
        .andWhere("rd.is_archived = false")
        .andWhere("rd.status = :status", { status: "active" })
        .andWhere("rd.stripe_subscription_id IS NULL")
        .andWhere("rd.billing_interval = :interval", {
          interval: billingInterval,
        })
        .andWhere("rd.donor_id IS NOT NULL")
        .orderBy("rd.id", "ASC")
        .getMany();

      for (const row of rows) {
        scanned += 1;

        if (row.initial_donation_id) {
          const initial = await this.donationRepo.findOne({
            where: { id: row.initial_donation_id, is_archived: false },
            select: ["id", "status"],
          });
          const initialStatus = String(initial?.status || "")
            .trim()
            .toLowerCase();
          if (
            !initial ||
            !["completed", "paid", "success"].includes(initialStatus)
          ) {
            skipped += 1;
            continue;
          }
        }

        let reminderPhase: "early" | "due" | null = null;
        let periodKey = defaultPeriodKey;
        let reminderDedupeKey = getReminderDedupeKey(frequency, periodKey);
        let periodBounds = defaultPeriodBounds;

        if (billingInterval === "month") {
          if (isSubscriptionEarlyBillingReminderDayToday(row)) {
            reminderPhase = "early";
          } else if (isSubscriptionBillingDayToday(row)) {
            reminderPhase = "due";
          } else {
            skipped += 1;
            continue;
          }

          const billingYmd =
            reminderPhase === "early"
              ? getPktYmdPlusDays(MONTHLY_EARLY_REMINDER_DAYS)
              : getPktDateString();
          periodKey = resolveMonthlyPeriodKeyForBillingYmd(billingYmd);
          reminderDedupeKey =
            reminderPhase === "early"
              ? getMonthlyEarlyReminderDedupeKey(periodKey)
              : getReminderDedupeKey(frequency, periodKey);
          const billingRef = new Date(`${billingYmd}T12:00:00`);
          periodBounds = options.period_key
            ? this.resolvePeriodBoundsFromKey(frequency, options.period_key)
            : getPeriodBoundsForFrequency(frequency, billingRef);
        }

        const installmentPaid =
          await this.recurringLedgerService.hasCompletedInstallmentForPeriod(
            row.id,
            periodKey,
          );
        if (installmentPaid) {
          skipped += 1;
          continue;
        }

        // Prepaid coverage: skip reminders (thanks sent once on upfront payment)
        if (isSubscriptionPrepaidPeriodCovered(row, periodKey)) {
          const prepaidSettled =
            await this.recurringLedgerService.hasCompletedInstallmentForPeriod(
              row.id,
              periodKey,
            );
          if (prepaidSettled) {
            if (!force && row.last_reminder_period_key !== reminderDedupeKey) {
              await this.stripeRecurringRepo.update(row.id, {
                last_reminder_period_key: reminderDedupeKey,
                last_reminder_sent_at: new Date(),
              });
            }
            skipped += 1;
            continue;
          }
        }

        // Always open period dues for this cycle (even if reminder is deduped)
        try {
          await this.recurringLedgerService.ensurePeriodDuesForSubscription(
            row,
            { upToPeriodKey: periodKey },
          );
        } catch (err: any) {
          this.logger.warn(
            `ensurePeriodDues failed for recurring_donation ${row.id}: ${err?.message || err}`,
          );
        }

        if (!force && row.last_reminder_period_key === reminderDedupeKey) {
          skipped += 1;
          continue;
        }

        // --- ENABLE LATER: skip / stop if subscription hit 3 unpaid payment reminders ---
        // if (await this.recurringLedgerService.isSubscriptionBlockedByUnpaidReminders(row.id)) {
        //   skipped += 1;
        //   continue;
        // }
        // --- END ENABLE LATER ---

        const paidDonation = await this.donationRepo
          .createQueryBuilder("d")
          .leftJoinAndSelect("d.donor", "donor")
          .where("d.donor_id = :donorId", { donorId: row.donor_id })
          .andWhere("LOWER(d.status) IN (:...statuses)", {
            statuses: ["completed", "paid", "success"],
          })
          .andWhere("d.is_archived = false")
          .andWhere("d.created_at >= :start AND d.created_at < :end", {
            start: periodBounds.start,
            end: periodBounds.end,
          })
          .orderBy("d.id", "DESC")
          .getOne();

        if (paidDonation && billingInterval === "month") {
          skipped += 1;
          continue;
        }

        if (dryRun) {
          if (paidDonation) thanks_sent += 1;
          else reminders_sent += 1;
          continue;
        }

        try {
          let donation = paidDonation;

          if (!donation) {
            // Exact donation for THIS subscription (not any pending for the donor)
            donation =
              await this.recurringLedgerService.resolveOrCreateInstallmentLinkDonation(
                row,
              );
          }

          if (donation && !donation.donor && row.donor_id) {
            const withDonor = await this.donationRepo.findOne({
              where: { id: donation.id },
              relations: ["donor"],
            });
            donation = withDonor || donation;
          }

          const donor = donation?.donor;
          if (!donor?.email && !donor?.phone) {
            skipped += 1;
            continue;
          }

          const donorName =
            donor?.name || donor?.email || `Donor #${row.donor_id}`;
          const amount =
            Number(paidDonation?.paid_amount) ||
            Number(paidDonation?.amount) ||
            Number(row.amount) ||
            Number(donation?.amount) ||
            0;

          if (donation) {
            (donation as any).donor_name = donorName;
            (donation as any).donor = donor;
          }

          let sentOk = false;
          if (paidDonation) {
            // Skip channels already thanked on payment (avoid double email/WhatsApp)
            const alreadyEmailed = paidDonation.email_sent === true;
            const alreadyMessaged = paidDonation.message_sent === true;
            if (alreadyEmailed && alreadyMessaged) {
              await this.stripeRecurringRepo.update(row.id, {
                last_reminder_period_key: reminderDedupeKey,
                last_reminder_sent_at: new Date(),
              });
              skipped += 1;
              continue;
            }

            let emailJustSent = false;
            let messageJustSent = false;
            if (donor?.email && !alreadyEmailed) {
              emailJustSent =
                !!(await this.emailService.sendDonationSuccessEmail(
                  paidDonation,
                  donor,
                  donor.email,
                ));
              sentOk = emailJustSent || sentOk;
            }
            if (donor?.phone && !alreadyMessaged) {
              messageJustSent = !!(await this.whatsAppService.sendRecurringConfirmation({
                phoneNumber: donor.phone,
                amount: String(amount),
              }));
              sentOk = messageJustSent || sentOk;
            }

            if (emailJustSent || messageJustSent) {
              await this.donationRepo.update(paidDonation.id, {
                ...(emailJustSent ? { email_sent: true } : {}),
                ...(messageJustSent ? { message_sent: true } : {}),
              });
            }

            if (sentOk || (alreadyEmailed && !donor?.phone) || (alreadyMessaged && !donor?.email)) {
              await this.stripeRecurringRepo.update(row.id, {
                last_reminder_period_key: reminderDedupeKey,
                last_reminder_sent_at: new Date(),
              });
              // --- ENABLE LATER: payment received — reset unpaid reminder streak ---
              // await this.recurringLedgerService.resetUnpaidPaymentReminderCount(row.id);
              // --- END ENABLE LATER ---
              if (sentOk) thanks_sent += 1;
              else skipped += 1;
            } else {
              failed += 1;
            }
          } else {
            // Donation-view payment-link / reminder actions
            if (!donation?.id) {
              skipped += 1;
              continue;
            }
            if (donor?.email) {
              sentOk =
                (await this.emailService.sendRecurringPaymentReminderEmail(
                  donation,
                  donor.email,
                )) || sentOk;
            }
            if (donor?.phone) {
              const wa = await this.whatsAppService.sendRecurringPaymentReminder({
                phoneNumber: donor.phone,
                amount: String(amount),
                donationId: donation.id,
              });
              sentOk = wa || sentOk;
            }

            if (sentOk) {
              await this.stripeRecurringRepo.update(row.id, {
                last_reminder_period_key: reminderDedupeKey,
                last_reminder_sent_at: new Date(),
              });
              // --- ENABLE LATER: increment unpaid reminder count; disable at 3 ---
              // const reminderTrack =
              //   await this.recurringLedgerService.recordUnpaidPaymentReminderSent(
              //     row.id,
              //   );
              // if (reminderTrack.disabled) {
              //   this.logger.warn(
              //     `Recurring subscription ${row.id} auto-disabled after ${reminderTrack.count} unpaid payment reminders`,
              //   );
              // }
              // --- END ENABLE LATER ---
              reminders_sent += 1;
            } else {
              failed += 1;
            }
          }
        } catch (err: any) {
          failed += 1;
          this.logger.warn(
            `Ledger reminder/thanks failed for recurring_donation ${row.id}: ${err?.message || err}`,
          );
        }
      }
    }

    if (reminders_sent > 0 || thanks_sent > 0 || failed > 0) {
      this.logger.log(
        `Non-Stripe ledger reminders: scanned ${scanned}, reminders ${reminders_sent}, thanks ${thanks_sent}, skipped ${skipped}, failed ${failed}, dry_run=${dryRun}`,
      );
    }

    return {
      scanned,
      reminders_sent,
      thanks_sent,
      skipped,
      failed,
      dry_run: dryRun,
    };
  }

  private async resolveTemplateId(
    campaign: Campaign,
    slot: CampaignTemplateSlot,
    channel: "email" | "whatsapp",
    cache: Map<string, number | null>,
  ): Promise<number | null> {
    const fromCampaign = getSlotTemplateId(
      campaign.communication_templates,
      slot,
      channel,
    );
    if (fromCampaign) return fromCampaign;

    const cacheKey = `${slot}:${channel}`;
    if (cache.has(cacheKey)) return cache.get(cacheKey) ?? null;

    const purpose = SLOT_TO_TEMPLATE_PURPOSE[slot];
    const fallback =
      await this.emailTemplateService.findDefaultByPurposeAndChannel(
        purpose,
        channel,
      );
    const id = fallback?.id ?? null;
    cache.set(cacheKey, id);
    return id;
  }

  private async buildTemplateOverrides(
    pledge: ManualRecurringPledge,
    campaign: Campaign,
    periodKey: string,
  ): Promise<Record<string, string | number | null>> {
    const itemsSummary = formatPledgeItemsSummary(pledge.lines || []);
    const prepaidCoverage = formatPrepaidCoverageLabel(
      pledge.prepaid_start_period_key,
      pledge.prepaid_end_period_key,
    );

    return {
      amount:
        pledge.pledged_amount != null ? String(pledge.pledged_amount) : "",
      expected_amount:
        pledge.pledged_amount != null ? String(pledge.pledged_amount) : "",
      items_summary: itemsSummary,
      pledge_mode: pledge.pledge_mode || "",
      prepaid_coverage: prepaidCoverage,
      prepaid_months:
        pledge.prepaid_months != null ? String(pledge.prepaid_months) : "",
      current_month: formatPeriodKeyLabel(periodKey),
      campaign_name: campaign.title,
    };
  }
}
