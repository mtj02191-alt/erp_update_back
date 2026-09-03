import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { CreateDonationDto } from "./dto/create-donation.dto";
import { UpdateDonationDto } from "./dto/update-donation.dto";
import { InjectRepository } from "@nestjs/typeorm";
import { Brackets, Repository, SelectQueryBuilder } from "typeorm";
import { Donation } from "./entities/donation.entity";
import { DonationAttachment } from "./entities/donation-attachment.entity";
import { AddDonationAttachmentDto } from "./dto/add-donation-attachment.dto";
import {
  DonationInKind,
  DonationInKindCategory,
  DonationInKindCondition,
} from "../dms/donation_in_kind/entities/donation_in_kind.entity";
import { User, Department, UserRole } from "../users/user.entity";
import { EmailService } from "../email/email.service";
import { PayfastService } from "./payfast.service";
import {
  StripeRecurringParams,
  StripeService,
} from "./stripe.service";
import { AlfalahService } from "./alfalah/alfalah.service";
import { JazzCashService } from "./jazzcash/jazzcash.service";
import { verifyJazzCashSecureHash } from "./jazzcash/jazzcash-hash.util";
import { DonorService } from "../dms/donor/donor.service";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationType } from "../notifications/entities/notification.entity";
import {
  applyCommonFilters,
  FilterPayload,
  applyHybridFilters,
  HybridFilter,
  applyRelationsFilter,
  RelationsFilterConfig,
  applyRelationsSearch,
  normalizeRelationsFilters,
  applyMultiselectFilters,
} from "../utils/filters/common-filter.util";
import {
  DateRangeUtil,
  DateRangeOptions,
  MONTH_NAMES_SHORT,
  DAY_NAMES_SHORT,
} from "../utils/summary/date-range.util";
import axios from "axios";
import { WhatsAppService } from "src/utils/services/whatsapp.service";
import { Donor } from "src/dms/donor/entities/donor.entity";
import { RecurringDonationPlan } from "./recurring_donations/entities/recurring-donation-plan.entity";
import { CampaignsService } from "../dms/campaigns/campaigns.service";
import { DashboardAggregateService } from "../dashboard/dashboard-aggregate.service";
import { ProgressTrackersService } from "../progress_tracking/progress_trackers/progress-trackers.service";
import { ProgressTracker } from "../progress_tracking/progress_trackers/progress_tracker.entity";
import { ProgressBatchesService } from "../progress_tracking/progress_batches/progress-batches.service";
import { ProgressWorkflowTemplate } from "../progress_tracking/progress_workflow_templates/progress_workflow_template.entity";
import { DonationAuditService } from "./audit/donation-audit.service";
import { RecurringDonationsStripeService } from "./recurring_donations/recurring-donations-stripe.service";
import { RecurringDonationsLedgerService } from "./recurring_donations/recurring-donations-ledger.service";
import { resolveRecurringStartDateForStorage } from "./recurring_donations/recurring-billing-date.util";
import {
  resolvePrepaidContinueStartDate,
  resolvePrepaidPeriodCount,
} from "./recurring_donations/recurring-prepaid.util";
import { DonationAuditAction } from "./audit/donation-audit-action.enum";
import { DonationAuditSource } from "./audit/donation-audit-source.enum";
import {
  buildDonationFieldChanges,
  buildDonationStatusChange,
} from "./audit/donation-audit.util";
import { DataScopeService } from "../permissions/data-scope/data-scope.service";
import { ResolvedDataScope } from "../permissions/data-scope/data-scope.types";
import { GeographicScopeService } from "../permissions/geographic-scope/geographic-scope.service";
import { ResolvedGeographicScope } from "../permissions/geographic-scope/geographic-scope.types";
import {
  buildDonationGeoSnapshotForBackfill,
  buildDonationGeoSnapshotForCreate,
  mergeDonationGeoForUpdate,
} from "./utils/donation-geo.util";
import { ManualRecurringService } from "../dms/manual_recurring/manual-recurring.service";
import {
  ManualRecurringFrequency,
  PledgeMode,
} from "../dms/manual_recurring/utils/manual-recurring.constants";

@Injectable()
export class DonationsService {
  private readonly logger = new Logger(DonationsService.name);

  private static readonly MANUAL_DONATION_METHODS = [
    "cash",
    "bank_transfer",
    "credit_card",
    "cheque",
    "in_kind",
    "online",
    "reconciliation",
  ] as const;

  private static readonly ONLINE_DONATION_METHODS = [
    "meezan",
    "blinq",
    "payfast",
    "alfalah",
    "jazzcash",
    "stripe",
    "stripe_embed",
  ] as const;

  constructor(
    @InjectRepository(Donation)
    private donationRepository: Repository<Donation>,
    @InjectRepository(DonationAttachment)
    private donationAttachmentRepository: Repository<DonationAttachment>,
    @InjectRepository(DonationInKind)
    private donationInKindRepository: Repository<DonationInKind>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private emailService: EmailService,
    private payfastService: PayfastService,
    private stripeService: StripeService,
    private alfalahService: AlfalahService,
    private jazzcashService: JazzCashService,
    @InjectRepository(Donor)
    private donorRepository: Repository<Donor>,
    @InjectRepository(RecurringDonationPlan)
    private recurringDonationPlanRepository: Repository<RecurringDonationPlan>,
    private donorService: DonorService,
    private notificationsService: NotificationsService,
    private whatsAppService: WhatsAppService,
    private campaignsService: CampaignsService,
    private dashboardAggregateService: DashboardAggregateService,
    private progressTrackersService: ProgressTrackersService,
    private progressBatchesService: ProgressBatchesService,
    @InjectRepository(ProgressWorkflowTemplate)
    private readonly workflowTemplatesRepo: Repository<ProgressWorkflowTemplate>,
    private readonly donationAuditService: DonationAuditService,
    private readonly recurringDonationsStripeService: RecurringDonationsStripeService,
    private readonly recurringDonationsLedgerService: RecurringDonationsLedgerService,
    private readonly dataScopeService: DataScopeService,
    private readonly geographicScopeService: GeographicScopeService,
    private readonly manualRecurringService: ManualRecurringService,
  ) {}

  private async syncDonorLastDonationDate(
    donation?: Pick<Donation, "donor_id" | "date" | "created_at"> | null,
  ): Promise<void> {
    const donorId = donation?.donor_id;
    if (!donorId) {
      return;
    }
    const donationDate =
      donation?.date ?? donation?.created_at ?? new Date();
    await this.donorService.updateLastDonationDate(donorId, donationDate);
  }

  private async refreshDonorDonationStats(donorId?: number | null): Promise<void> {
    if (!donorId) return;
    try {
      await this.donorService.recalculateDonorDonationStats(donorId);
    } catch (error) {
      console.error("Failed to refresh donor donation stats:", error);
    }
  }

  private async syncDonationGeoFromDonorIfNeeded(
    donationId: number,
    donor?: Donor | null,
  ): Promise<void> {
    if (!donor?.id) return;

    const donation = await this.donationRepository.findOne({
      where: { id: donationId },
    });
    if (!donation) return;

    const snapshot = buildDonationGeoSnapshotForBackfill(donation, donor);
    await this.donationRepository.update(donationId, snapshot);
  }

  async resolveDonationListScope(
    user: { id?: number; role?: string; department?: string } | null | undefined,
    sourceAccess: { online: boolean; offline: boolean },
  ): Promise<ResolvedDataScope | null> {
    if (!user?.id || user.id === -1) return null;

    const onlineScope = await this.dataScopeService.resolveScope(
      user.id,
      user.role,
      user.department,
      "fund_raising",
      "online_donations",
    );
    const offlineScope = await this.dataScopeService.resolveScope(
      user.id,
      user.role,
      user.department,
      "fund_raising",
      "offline_donations",
    );

    if (sourceAccess.online && sourceAccess.offline) {
      return this.dataScopeService.mergeScopes(onlineScope, offlineScope);
    }
    if (sourceAccess.online) return onlineScope;
    if (sourceAccess.offline) return offlineScope;
    return onlineScope;
  }

  async resolveDonationRecordScope(
    user: { id?: number; role?: string; department?: string } | null | undefined,
    donationSource: string | null | undefined,
  ): Promise<ResolvedDataScope | null> {
    if (!user?.id || user.id === -1) return null;
    const module =
      donationSource === "website" ? "online_donations" : "offline_donations";
    return this.dataScopeService.resolveScope(
      user.id,
      user.role,
      user.department,
      "fund_raising",
      module,
    );
  }

  assertDonationRecordAccess(
    scope: ResolvedDataScope | null,
    record: Donation,
  ): void {
    if (!scope) return;
    // Website donations are system-created (no staff owner); geographic scope governs access.
    if (record.donation_source === "website") return;
    this.dataScopeService.assertRecordAccess(scope, record);
  }

  private resolveDonationListMode(
    filters: FilterPayload,
    donationSourceNot: string | null | undefined,
  ): "online" | "offline" | "both" {
    if (filters.donation_source === "website") return "online";
    if (
      donationSourceNot !== undefined &&
      donationSourceNot !== null &&
      donationSourceNot !== ""
    ) {
      return "offline";
    }
    return "both";
  }

  /**
   * Data scope on created_by (self / team / department).
   * Online (website) rows usually skip ownership unless a Team filter is active
   * (website donations are system-created). Offline always applies ownership.
   * Geographic territory is applied separately and stacks with this (AND).
   */
  private applyDonationListDataScope(
    query: SelectQueryBuilder<Donation>,
    scope: ResolvedDataScope | null,
    listMode: "online" | "offline" | "both",
    _geoScope?: ResolvedGeographicScope | null,
    paramSuffix = "",
    teamFilterActive = false,
  ): void {
    if (!scope) return;
    if (scope.bypass || scope.type === "org" || scope.allowedUserIds == null) {
      return;
    }

    if (listMode === "online" && !teamFilterActive) {
      return;
    }

    if (listMode === "online" && teamFilterActive) {
      this.dataScopeService.applyToQuery(query, "donation", scope);
      return;
    }

    if (listMode === "offline") {
      this.dataScopeService.applyToQuery(query, "donation", scope);
      return;
    }

    if (!scope.allowedUserIds.length) {
      query.andWhere("1 = 0");
      return;
    }

    const paramKey = `dataScopeMixed${paramSuffix}`;
    if (teamFilterActive) {
      query.andWhere(`donation.created_by IN (:...${paramKey}_userIds)`, {
        [`${paramKey}_userIds`]: scope.allowedUserIds,
      });
      return;
    }

    query.andWhere(
      new Brackets((qb) => {
        qb.where(`donation.donation_source = :${paramKey}_website`, {
          [`${paramKey}_website`]: "website",
        });
        qb.orWhere(`donation.created_by IN (:...${paramKey}_userIds)`, {
          [`${paramKey}_userIds`]: scope.allowedUserIds,
        });
      }),
    );
  }

  private logFinalQuery(
    label: string,
    qb: SelectQueryBuilder<Donation>,
  ): void {
    this.logger.log(
      `[donations.findAll:${label}] SQL:\n${qb.getQuery()}\nPARAMS: ${JSON.stringify(qb.getParameters())}`,
    );
  }

  /**
   * Applies offline donation filter: donation_source != value (typically 'website').
   */
  private applyDonationSourceNotFilter(
    query: SelectQueryBuilder<Donation>,
    notSource: string | null | undefined,
    paramSuffix = "",
  ): void {
    if (notSource === undefined || notSource === null || notSource === "") {
      return;
    }
    const paramKey = `donationSourceNot${paramSuffix}`;
    query.andWhere(
      `COALESCE(donation.donation_source, '') != :${paramKey}`,
      { [paramKey]: String(notSource) },
    );
  }

  // Dashboard aggregates were removed. Fundraising dashboard reads directly from main tables.

  /** Staff user id for created_by / updated_by; public website user (-1) → null. */
  private donationAuditUserId(user: any): number | null {
    const id = user?.id;
    if (id == null || Number(id) === -1) return null;
    return Number(id);
  }

  /**
   * Previously deferred donor linking for online gateways (invoice first, link later).
   * That caused donor_id gaps on pending donations — always link donor at create time.
   */
  shouldDeferDonorPostCreate(_createDonationDto: CreateDonationDto): boolean {
    return false;
  }

  private donorDisplayName(
    donor: { name?: string } | null | undefined,
    createDonationDto: CreateDonationDto,
  ): string {
    return donor?.name || createDonationDto.donor_name || "Anonymous";
  }

  private withDonationId<T extends Record<string, unknown>>(
    payload: T,
    donationId: number,
  ): T & { donationId: number } {
    return { ...payload, donationId };
  }

  /** Stripe subscription + internal recurring row when payload has recurring or legacy frequency. */
  private isDonationRecurring(createDonationDto: CreateDonationDto): boolean {
    if (createDonationDto.recurring?.interval) return true;
    const freq = String(createDonationDto.donation_frequency || "")
      .trim()
      .toLowerCase();
    return freq === "monthly" || freq === "weekly" || freq === "daily";
  }

  private hasRecurringConsent(createDonationDto: CreateDonationDto): boolean {
    return (
      createDonationDto.recurring_consent === true ||
      createDonationDto.recurring?.consent === true
    );
  }

  /** Validates consent + start_date rules for recurring donations. */
  private assertRecurringDonationPayload(
    createDonationDto: CreateDonationDto,
  ): void {
    if (this.wantsManualRecurringEnrollment(createDonationDto)) {
      const pledgeMode = String(createDonationDto.pledge_mode || "").trim();
      if (pledgeMode === PledgeMode.PREPAID_MONTHS) {
        const months = Number(createDonationDto.prepaid_months);
        if (!Number.isFinite(months) || months < 1) {
          throw new HttpException(
            "prepaid_months is required for prepaid_months pledge mode",
            400,
          );
        }
        if (!createDonationDto.campaign_id) {
          throw new HttpException(
            "Prepaid pledge requires campaign_id",
            400,
          );
        }
        return;
      }
      if (!this.hasRecurringConsent(createDonationDto)) {
        throw new HttpException(
          "Manual recurring enrollment requires recurring_consent",
          400,
        );
      }
      return;
    }

    if (!this.isDonationRecurring(createDonationDto)) return;

    if (!this.hasRecurringConsent(createDonationDto)) {
      throw new HttpException(
        "Recurring donation requires consent (recurring_consent or recurring.consent must be true)",
        400,
      );
    }

    const mode = String(
      createDonationDto.recurring?.start_date_mode || "same_date",
    )
      .trim()
      .toLowerCase();
    const startDate = createDonationDto.recurring?.start_date?.trim();

    if (mode === "custom" && !startDate) {
      throw new HttpException(
        "recurring.start_date is required when start_date_mode is custom",
        400,
      );
    }

    if (mode === "day_of_month") {
      const dom = createDonationDto.recurring?.day_of_month;
      if (
        dom != null &&
        (!Number.isFinite(Number(dom)) || Number(dom) < 1 || Number(dom) > 31)
      ) {
        throw new HttpException(
          "recurring.day_of_month must be between 1 and 31",
          400,
        );
      }
    }

    if (startDate && !/^\d{4}-\d{2}-\d{2}$/.test(startDate)) {
      throw new HttpException(
        "recurring.start_date must be YYYY-MM-DD",
        400,
      );
    }
  }

  /** Prepaid campaign pledges only — regular recurring uses recurring_donations ledger. */
  private wantsManualRecurringEnrollment(
    createDonationDto: CreateDonationDto,
  ): boolean {
    if (!this.usesLegacyRecurringPlan(createDonationDto.donation_method)) {
      return false;
    }
    const pledgeMode = String(createDonationDto.pledge_mode || "").trim();
    if (pledgeMode !== PledgeMode.PREPAID_MONTHS) {
      return false;
    }
    if (createDonationDto.enroll_manual_recurring === true) {
      return true;
    }
    const hasLines =
      Array.isArray(createDonationDto.campaign_pledge_lines) &&
      createDonationDto.campaign_pledge_lines.length > 0;
    return Boolean(createDonationDto.campaign_id && hasLines);
  }

  private mapManualRecurringFrequency(
    createDonationDto: CreateDonationDto,
  ): ManualRecurringFrequency {
    const freq = String(createDonationDto.donation_frequency || "")
      .trim()
      .toLowerCase();
    if (freq === "daily") return ManualRecurringFrequency.DAILY;
    if (freq === "weekly") return ManualRecurringFrequency.WEEKLY;
    return ManualRecurringFrequency.MONTHLY;
  }

  private mapLedgerBillingInterval(
    createDonationDto: CreateDonationDto,
  ): "day" | "week" | "month" {
    const fromRecurring = String(createDonationDto.recurring?.interval || "")
      .trim()
      .toLowerCase();
    if (fromRecurring === "day" || fromRecurring === "daily") return "day";
    if (fromRecurring === "week" || fromRecurring === "weekly") return "week";
    if (fromRecurring === "month" || fromRecurring === "monthly") return "month";

    const freq = String(createDonationDto.donation_frequency || "")
      .trim()
      .toLowerCase();
    if (freq === "daily") return "day";
    if (freq === "weekly") return "week";
    return "month";
  }

  /** Normalized billing anchor for Stripe + non-Stripe ledger subscriptions. */
  private resolveRecurringStartConfig(createDonationDto: CreateDonationDto): {
    startDateMode: string;
    startDate: string | null;
  } {
    const prepaidPeriods = resolvePrepaidPeriodCount({
      prepaid_periods: createDonationDto.prepaid_periods,
      prepaid_months: createDonationDto.prepaid_months,
    });
    if (prepaidPeriods != null && prepaidPeriods >= 1) {
      const billingInterval = this.mapLedgerBillingInterval(createDonationDto);
      const startDate = resolvePrepaidContinueStartDate(
        prepaidPeriods,
        billingInterval,
      );
      return {
        startDateMode: billingInterval === "month" ? "day_of_month" : "same_date",
        startDate,
      };
    }

    const recurring = createDonationDto.recurring;
    return resolveRecurringStartDateForStorage({
      startDateMode: recurring?.start_date_mode,
      startDate: recurring?.start_date,
      dayOfMonth: recurring?.day_of_month,
    });
  }

  private resolveLedgerPeriodAmount(
    createDonationDto: CreateDonationDto,
    savedAmount: number | null | undefined,
  ): number | null {
    const raw =
      savedAmount ??
      (createDonationDto.amount != null ? Number(createDonationDto.amount) : null);
    if (raw == null || !Number.isFinite(Number(raw))) return null;
    const total = Math.round(Number(raw));
    const prepaidPeriods = resolvePrepaidPeriodCount({
      prepaid_periods: createDonationDto.prepaid_periods,
      prepaid_months: createDonationDto.prepaid_months,
    });
    if (prepaidPeriods != null && prepaidPeriods > 1) {
      return Math.max(1, Math.round(total / prepaidPeriods));
    }
    return total;
  }

  /** True when donor prepaid N periods and should continue on ledger after that. */
  private wantsPrepaidThenRecurring(createDonationDto: CreateDonationDto): boolean {
    const periods = resolvePrepaidPeriodCount({
      prepaid_periods: createDonationDto.prepaid_periods,
      prepaid_months: createDonationDto.prepaid_months,
    });
    return (
      periods != null &&
      periods >= 1 &&
      this.hasRecurringConsent(createDonationDto) &&
      (Boolean(createDonationDto.recurring?.interval) ||
        this.isDonationRecurring(createDonationDto) ||
        String(createDonationDto.pledge_mode || "").trim() === "prepaid_months")
    );
  }

  /** Non-Stripe recurring → same Recurring Donations list as Stripe (cron reminders). */
  private async ensureNonStripeRecurringLedgerSubscription(
    createDonationDto: CreateDonationDto,
    savedDonation: {
      id: number;
      amount?: number;
      currency?: string;
      donation_method?: string;
      project_id?: string;
      campaign_id?: number;
      donation_type?: string;
    },
    donorId: number | null,
  ): Promise<void> {
    const prepaidThenRecurring = this.wantsPrepaidThenRecurring(createDonationDto);
    if (!this.isDonationRecurring(createDonationDto) && !prepaidThenRecurring) {
      return;
    }

    // Stripe auto-subscriptions use webhooks; prepaid-then-recurring still uses ledger reminders
    const isStripeMethod = !this.usesLegacyRecurringPlan(
      createDonationDto.donation_method || savedDonation.donation_method,
    );
    if (isStripeMethod && !prepaidThenRecurring) return;

    const { startDateMode, startDate } =
      this.resolveRecurringStartConfig(createDonationDto);
    const periodAmount = this.resolveLedgerPeriodAmount(
      createDonationDto,
      savedDonation.amount ?? Number(createDonationDto.amount) ?? null,
    );
    const billingInterval = this.mapLedgerBillingInterval(createDonationDto);
    const prepaidPeriods = this.wantsPrepaidThenRecurring(createDonationDto)
      ? resolvePrepaidPeriodCount({
          prepaid_periods: createDonationDto.prepaid_periods,
          prepaid_months: createDonationDto.prepaid_months,
        })
      : null;

    await this.recurringDonationsLedgerService.ensureNonStripeSubscriptionFromDonation(
      {
        donationId: savedDonation.id,
        donorId,
        amount: periodAmount,
        currency: savedDonation.currency || createDonationDto.currency || "PKR",
        donationMethod:
          savedDonation.donation_method || createDonationDto.donation_method,
        projectId: savedDonation.project_id || createDonationDto.project_id,
        campaignId:
          savedDonation.campaign_id ??
          (createDonationDto.campaign_id
            ? Number(createDonationDto.campaign_id)
            : null),
        donationType:
          savedDonation.donation_type || createDonationDto.donation_type,
        billingInterval,
        billingIntervalCount: createDonationDto.recurring?.interval_count ?? 1,
        startDateMode,
        startDate,
        consent: this.hasRecurringConsent(createDonationDto),
        prepaidPeriods,
      },
    );

    if (donorId) {
      const donor = await this.donorRepository.findOne({
        where: { id: donorId },
      });
      if (donor) {
        this.applyDonorRecurringConsent(donor);
        await this.donorRepository.save(donor);
      }
    }
  }

  private buildManualRecurringIntent(
    createDonationDto: CreateDonationDto,
  ): Record<string, unknown> | null {
    if (!this.wantsManualRecurringEnrollment(createDonationDto)) {
      return null;
    }
    const lines = (createDonationDto.campaign_pledge_lines || [])
      .map((line) => ({
        campaign_item_id: Number(line.campaign_item_id),
        quantity: Number(line.quantity),
      }))
      .filter(
        (line) =>
          Number.isFinite(line.campaign_item_id) &&
          line.campaign_item_id > 0 &&
          Number.isFinite(line.quantity) &&
          line.quantity > 0,
      );
    if (!lines.length) return null;

    return {
      enroll: true,
      pledge_mode: PledgeMode.PREPAID_MONTHS,
      prepaid_months: Number(createDonationDto.prepaid_months) || null,
      frequency: this.mapManualRecurringFrequency(createDonationDto),
      lines,
      pledged_amount: Number(createDonationDto.amount) || null,
      campaign_id: createDonationDto.campaign_id
        ? Number(createDonationDto.campaign_id)
        : null,
    };
  }

  private isSuccessfulDonationStatus(status?: string | null): boolean {
    const s = String(status || "")
      .trim()
      .toLowerCase();
    return s === "completed" || s === "paid" || s === "success";
  }

  /** Pending allowed for now — enroll pledge at checkout, not only after payment. */
  private canActivateManualRecurringFromDonationStatus(
    status?: string | null,
  ): boolean {
    const s = String(status || "")
      .trim()
      .toLowerCase();
    return (
      !s ||
      s === "pending" ||
      this.isSuccessfulDonationStatus(status)
    );
  }

  /**
   * True only when THIS donation is a recurring payment (initial / installment / intent).
   * Do not use donor.recurring or “donor has any active subscription” — that would
   * incorrectly skip the PKR 5000 threshold for unrelated one-time donations.
   */
  private async isRecurringRelatedDonation(donation: {
    id?: number | null;
    donor_id?: number | null;
    amount?: number | null;
    donation_type?: string | null;
    donation_source?: string | null;
    note?: string | null;
    recurrence_id?: number | null;
    manual_recurring_intent?: Record<string, unknown> | null;
    donor?: { id?: number | null; recurring?: boolean | null } | null;
  } | null | undefined): Promise<boolean> {
    if (!donation) return false;

    const intent = donation.manual_recurring_intent;
    if (intent && typeof intent === "object") {
      if (
        intent.enroll === true ||
        intent.installment_link === true ||
        intent.recurring_subscription_id != null
      ) {
        return true;
      }
    }

    if (
      donation.recurrence_id != null &&
      Number(donation.recurrence_id) > 0
    ) {
      return true;
    }

    const source = String(donation.donation_source || "").toLowerCase();
    if (source.includes("recurring")) return true;

    const type = String(donation.donation_type || "").toLowerCase();
    if (type.includes("recurring")) return true;

    const note = String(donation.note || "").toLowerCase();
    if (note.includes("subscription #") || note.includes("installment")) {
      return true;
    }

    const donationId = Number(donation.id);
    if (!Number.isFinite(donationId) || donationId <= 0) {
      return false;
    }

    // Linked specifically as this donation (initial or installment payment), not "any sub for donor"
    try {
      const qb = this.donationRepository.manager
        .createQueryBuilder()
        .select("1")
        .from("recurring_donations", "rd")
        .where("rd.is_archived = false")
        .andWhere(
          `(
            rd.initial_donation_id = :donationId
            OR (
              rd.record_type = 'installment'
              AND rd.stripe_payment_intent_id = :donationIdStr
            )
          )`,
          {
            donationId,
            donationIdStr: String(donationId),
          },
        )
        .limit(1);
      const row = await qb.getRawOne();
      if (row) return true;
    } catch {
      // ignore lookup failures — fall through to amount threshold
    }
    return false;
  }

  /** Auto WhatsApp: unsent + (this donation is recurring OR amount >= 5000). */
  private async canAutoSendDonationMessage(donation: {
    id?: number | null;
    donor_id?: number | null;
    message_sent?: boolean | null;
    amount?: number | null;
    donation_type?: string | null;
    donation_source?: string | null;
    note?: string | null;
    recurrence_id?: number | null;
    manual_recurring_intent?: Record<string, unknown> | null;
    donor?: { id?: number | null; recurring?: boolean | null } | null;
  } | null | undefined): Promise<boolean> {
    if (donation?.message_sent === true) return false;
    return this.isThanksEligibleDonation(donation);
  }

  /** Auto email: unsent + (this donation is recurring OR amount >= 5000). */
  private async canAutoSendDonationEmail(donation: {
    id?: number | null;
    donor_id?: number | null;
    email_sent?: boolean | null;
    amount?: number | null;
    donation_type?: string | null;
    donation_source?: string | null;
    note?: string | null;
    recurrence_id?: number | null;
    manual_recurring_intent?: Record<string, unknown> | null;
    donor?: { id?: number | null; recurring?: boolean | null } | null;
  } | null | undefined): Promise<boolean> {
    if (donation?.email_sent === true) return false;
    return this.isThanksEligibleDonation(donation);
  }

  /**
   * Auto abandon/thanks eligibility (ignores sent flags):
   * - recurring donation → always eligible (no amount check)
   * - one-time (normal) → only when amount >= 5000
   */
  private async isThanksEligibleDonation(donation: {
    id?: number | null;
    donor_id?: number | null;
    amount?: number | null;
    donation_type?: string | null;
    donation_source?: string | null;
    note?: string | null;
    recurrence_id?: number | null;
    manual_recurring_intent?: Record<string, unknown> | null;
    donor?: { id?: number | null; recurring?: boolean | null } | null;
  } | null | undefined): Promise<boolean> {
    if (!donation) return false;
    if (await this.isRecurringRelatedDonation(donation)) {
      this.logger.log(
        `Auto thanks/abandon eligible donationId=${donation.id} reason=recurring (amount check skipped)`,
      );
      return true;
    }
    const amount = Number(donation.amount);
    const eligible = Number.isFinite(amount) && amount >= 5000;
    this.logger.log(
      `Auto thanks/abandon eligibility donationId=${donation.id} recurring=false amount=${donation.amount} eligible=${eligible} (threshold=5000)`,
    );
    return eligible;
  }

  /** Claim a thanks channel flag so concurrent paths cannot double-send. */
  private async claimDonationThanksFlag(
    donationId: number,
    flag: "message_sent" | "email_sent",
  ): Promise<boolean> {
    const result = await this.donationRepository
      .createQueryBuilder()
      .update(Donation)
      .set({ [flag]: true })
      .where("id = :id", { id: donationId })
      .andWhere(`(${flag} IS NULL OR ${flag} = false)`)
      .execute();
    return (result.affected ?? 0) > 0;
  }

  private async releaseDonationThanksFlag(
    donationId: number,
    flag: "message_sent" | "email_sent",
  ): Promise<void> {
    await this.donationRepository.update(donationId, { [flag]: false });
  }

  /** Mark thanks channels as sent (manual donation-view actions). */
  async markDonationThanksSent(
    donationId: number,
    opts: { email?: boolean; whatsapp?: boolean },
  ): Promise<void> {
    const patch: Partial<Donation> = {};
    if (opts.email) patch.email_sent = true;
    if (opts.whatsapp) patch.message_sent = true;
    if (Object.keys(patch).length) {
      await this.donationRepository.update(donationId, patch);
    }
  }

  /**
   * Single thanks path for a completed donation (email + WhatsApp).
   * Idempotent via message_sent / email_sent claim — never double-sends a channel.
   */
  private async sendDonationThanksOnce(donationId: number): Promise<void> {
    if (!donationId) return;

    const donation = await this.donationRepository.findOne({
      where: { id: donationId },
      relations: ["donor"],
    });
    if (!donation?.donor) return;

    const status = String(donation.status || "")
      .trim()
      .toLowerCase();
    if (!["completed", "paid", "success"].includes(status)) return;

    if (!(await this.isThanksEligibleDonation(donation))) return;

    const donor = donation.donor;
    const donorName =
      donor.name ||
      donor.first_name ||
      donor.email ||
      "Valued Donor";

    if (donor.phone && donation.message_sent !== true) {
      const claimed = await this.claimDonationThanksFlag(
        donationId,
        "message_sent",
      );
      if (claimed) {
        try {
          const ok = await this.whatsAppService.sendPaymentConfirmation({
            phoneNumber: donor.phone,
            userName: donorName,
            amount: donation.amount,
          });
          if (!ok) {
            await this.releaseDonationThanksFlag(donationId, "message_sent");
          }
        } catch (err: any) {
          await this.releaseDonationThanksFlag(donationId, "message_sent");
          this.logger.warn(
            `Thanks WhatsApp failed for donation ${donationId}: ${err?.message || err}`,
          );
        }
      }
    }

    if (donor.email && donation.email_sent !== true) {
      const claimed = await this.claimDonationThanksFlag(
        donationId,
        "email_sent",
      );
      if (claimed) {
        try {
          const ok = await this.emailService.sendDonationSuccessEmail(
            donation,
            donor,
            donor.email,
          );
          if (!ok) {
            await this.releaseDonationThanksFlag(donationId, "email_sent");
          }
        } catch (err: any) {
          await this.releaseDonationThanksFlag(donationId, "email_sent");
          this.logger.warn(
            `Thanks email failed for donation ${donationId}: ${err?.message || err}`,
          );
        }
      }
    }
  }

  /**
   * Side-effects when a donation becomes paid/completed:
   * prepaid pledge activation + non-Stripe recurring installment + thanks (once).
   */
  private async afterSuccessfulDonationPayment(
    donationId: number,
  ): Promise<void> {
    await this.activateManualRecurringAfterSuccessfulPayment(donationId);
    try {
      await this.recurringDonationsLedgerService.recordNonStripeInstallmentFromDonation(
        donationId,
      );
    } catch (err: any) {
      this.logger.error(
        `recordNonStripeInstallmentFromDonation failed for ${donationId}: ${err?.message || err}`,
      );
    }

    try {
      await this.sendDonationThanksOnce(donationId);
    } catch (err: any) {
      this.logger.error(
        `sendDonationThanksOnce failed for ${donationId}: ${err?.message || err}`,
      );
    }

    await this.advanceDonorPipelineIfDonationCompleted(donationId);
  }

  private async advanceDonorPipelineIfDonationCompleted(
    donationId: number,
  ): Promise<void> {
    try {
      const donation = await this.donationRepository.findOne({
        where: { id: donationId },
      });
      if (!donation?.donor_id) return;
      if (!this.isSuccessfulDonationStatus(donation.status)) return;
      await this.donorService.advancePipelineOnDonationCompleted(
        donation.donor_id,
        {
          donationId: donation.id,
          amount: Number(donation.paid_amount ?? donation.amount ?? 0),
          currency: donation.currency,
        },
      );
    } catch (err: any) {
      this.logger.error(
        `advanceDonorPipelineIfDonationCompleted failed for ${donationId}: ${err?.message || err}`,
      );
    }
  }

  /**
   * Activate manual recurring from stored intent (pending or paid).
   * Safe to call repeatedly (idempotent). Never throws — must not break IPN/status flows.
   */
  async activateManualRecurringAfterSuccessfulPayment(
    donationId: number,
  ): Promise<{ activated: boolean; reason?: string }> {
    try {
      const donation = await this.donationRepository.findOne({
        where: { id: donationId },
        relations: ["donor"],
      });
      if (!donation) {
        return { activated: false, reason: "Donation not found" };
      }
      if (!this.canActivateManualRecurringFromDonationStatus(donation.status)) {
        return {
          activated: false,
          reason: `Donation status not eligible: ${donation.status}`,
        };
      }

      const intent = donation.manual_recurring_intent as Record<
        string,
        unknown
      > | null;
      if (!intent || intent.enroll !== true) {
        return { activated: false, reason: "No pending manual recurring intent" };
      }
      if (intent.activated_at) {
        return { activated: false, reason: "Already activated" };
      }

      const donorId = donation.donor_id;
      if (!donorId) {
        return { activated: false, reason: "Missing donor" };
      }

      const intentCampaignId = Number(intent.campaign_id);
      const donationCampaignId = Number(donation.campaign_id);
      const campaignId =
        Number.isFinite(intentCampaignId) && intentCampaignId > 0
          ? intentCampaignId
          : Number.isFinite(donationCampaignId) && donationCampaignId > 0
            ? donationCampaignId
            : null;

      const lines = Array.isArray(intent.lines)
        ? (intent.lines as Array<{ campaign_item_id: number; quantity: number }>)
            .map((line) => ({
              campaign_item_id: Number(line.campaign_item_id),
              quantity: Number(line.quantity),
            }))
            .filter(
              (line) =>
                Number.isFinite(line.campaign_item_id) &&
                line.campaign_item_id > 0 &&
                Number.isFinite(line.quantity) &&
                line.quantity > 0,
            )
        : [];

      const pledgedFromIntent = Number(intent.pledged_amount);
      const pledgedFromDonation = Number(donation.amount);
      const pledgedAmount =
        Number.isFinite(pledgedFromIntent) && pledgedFromIntent > 0
          ? pledgedFromIntent
          : Number.isFinite(pledgedFromDonation) && pledgedFromDonation > 0
            ? pledgedFromDonation
            : null;

      if (!lines.length && !pledgedAmount) {
        return { activated: false, reason: "Intent has no lines or amount" };
      }
      if (lines.length && !campaignId) {
        return {
          activated: false,
          reason: "Campaign required when pledge lines are present",
        };
      }

      const pledgeMode =
        String(intent.pledge_mode || "").trim() === PledgeMode.PREPAID_MONTHS
          ? PledgeMode.PREPAID_MONTHS
          : PledgeMode.RECURRING_MONTHLY;

      const freqRaw = String(intent.frequency || "").toLowerCase();
      const frequency =
        freqRaw === "daily"
          ? ManualRecurringFrequency.DAILY
          : freqRaw === "weekly"
            ? ManualRecurringFrequency.WEEKLY
            : ManualRecurringFrequency.MONTHLY;

      await this.manualRecurringService.createFromWebsiteCheckout({
        donor_id: donorId,
        campaign_id: campaignId,
        ...(lines.length ? { lines } : {}),
        ...(pledgedAmount != null ? { pledged_amount: pledgedAmount } : {}),
        pledge_mode: pledgeMode,
        prepaid_months:
          pledgeMode === PledgeMode.PREPAID_MONTHS
            ? Number(intent.prepaid_months) || null
            : null,
        frequency,
        currency: donation.currency || "PKR",
        remind_via_email: true,
        remind_via_whatsapp: true,
        notes: `Enrolled from donation #${donation.id} (status=${donation.status || "pending"}, ${donation.donation_method || "online"})`,
      });

      await this.donationRepository.update(donationId, {
        manual_recurring_intent: {
          ...intent,
          enroll: false,
          activated_at: new Date().toISOString(),
          activated_donation_id: donation.id,
        },
      } as any);

      if (donation.donor) {
        this.applyDonorRecurringConsent(donation.donor);
        await this.donorRepository.save(donation.donor);
      }

      this.logger.log(
        `Manual recurring activated for donation ${donationId} (donor ${donorId}, campaign ${campaignId})`,
      );
      return { activated: true };
    } catch (err: any) {
      this.logger.error(
        `Manual recurring activation failed for donation ${donationId}: ${err?.message || err}`,
      );
      return { activated: false, reason: err?.message || "Activation failed" };
    }
  }

  /** Cron/safety net: activate intents for pending/paid donations that never enrolled. */
  async activatePendingManualRecurringIntents(limit = 100): Promise<{
    scanned: number;
    activated: number;
    skipped: number;
  }> {
    const rows = await this.donationRepository
      .createQueryBuilder("d")
      .where("LOWER(COALESCE(d.status, 'pending')) IN (:...statuses)", {
        statuses: ["pending", "completed", "paid", "success"],
      })
      .andWhere("d.manual_recurring_intent IS NOT NULL")
      .andWhere(`d.manual_recurring_intent->>'enroll' = 'true'`)
      .andWhere(`(d.manual_recurring_intent->>'activated_at') IS NULL`)
      .orderBy("d.id", "ASC")
      .take(Math.min(Math.max(Number(limit) || 100, 1), 500))
      .getMany();

    let activated = 0;
    let skipped = 0;
    for (const row of rows) {
      const result = await this.activateManualRecurringAfterSuccessfulPayment(
        row.id,
      );
      if (result.activated) activated += 1;
      else skipped += 1;
    }
    return { scanned: rows.length, activated, skipped };
  }

  /** Maps API `recurring` (or legacy frequency) to Stripe billing params. */
  private resolveStripeRecurring(
    createDonationDto: CreateDonationDto,
  ): StripeRecurringParams | undefined {
    const prepaidPeriods = resolvePrepaidPeriodCount({
      prepaid_periods: createDonationDto.prepaid_periods,
      prepaid_months: createDonationDto.prepaid_months,
    });
    if (prepaidPeriods != null && prepaidPeriods >= 1) {
      // Prepaid total is charged once; ledger handles continue-after coverage
      return undefined;
    }

    const consent = this.hasRecurringConsent(createDonationDto);
    const { startDateMode, startDate } =
      this.resolveRecurringStartConfig(createDonationDto);

    if (createDonationDto.recurring?.interval) {
      return {
        interval: createDonationDto.recurring
          .interval as StripeRecurringParams["interval"],
        interval_count: createDonationDto.recurring.interval_count ?? 1,
        start_date_mode: startDateMode,
        start_date: startDate ?? undefined,
        consent,
      };
    }

    const freq = String(createDonationDto.donation_frequency || "")
      .trim()
      .toLowerCase();
    if (freq === "weekly") {
      return {
        interval: "week",
        interval_count: 1,
        start_date_mode: startDateMode,
        start_date: startDate ?? undefined,
        consent,
      };
    }
    if (freq === "monthly") {
      return {
        interval: "month",
        interval_count: 1,
        start_date_mode: startDateMode,
        start_date: startDate ?? undefined,
        consent,
      };
    }
    if (freq === "daily") {
      return {
        interval: "day",
        interval_count: 1,
        start_date_mode: startDateMode,
        start_date: startDate ?? undefined,
        consent,
      };
    }
    return undefined;
  }

  private applyDonorRecurringConsent(donor: Donor): void {
    donor.recurring = true;
    if (donor.recurring_consent !== true) {
      donor.recurring_consent = true;
      donor.recurring_consent_at = new Date();
    }
  }

  /** Legacy plan table is for bank/Meezan recurring — not Stripe subscriptions. */
  private usesLegacyRecurringPlan(donationMethod?: string): boolean {
    const method = String(donationMethod || "").trim().toLowerCase();
    return method !== "stripe" && method !== "stripe_embed";
  }

  /** Create legacy plan row + link donation.recurrence_id (Meezan etc.). */
  private async createLegacyRecurringPlanIfNeeded(
    createDonationDto: CreateDonationDto,
    donorId: number | null,
    donationId?: number,
  ): Promise<number> {
    if (this.wantsManualRecurringEnrollment(createDonationDto)) {
      return 0;
    }
    if (
      !this.isDonationRecurring(createDonationDto) ||
      !this.usesLegacyRecurringPlan(createDonationDto.donation_method)
    ) {
      return 0;
    }

    const recurringDonation = this.recurringDonationPlanRepository.create({
      ...createDonationDto,
      donor_id: donorId,
    });
    const savedRecurring =
      await this.recurringDonationPlanRepository.save(recurringDonation);

    if (donationId) {
      const donation = await this.donationRepository.findOne({
        where: { id: donationId },
      });
      if (donation && !donation.recurrence_id) {
        await this.donationRepository.update(donationId, {
          recurrence_id: savedRecurring.id,
        });
      }
    }

    return savedRecurring.id;
  }

  private async assertDonorNotArchivedByEmail(email: string): Promise<void> {
    const existing = await this.donorService.findByEmail(email);
    if (existing?.is_archived === true) {
      throw new HttpException("Donor is archived", 400);
    }
  }

  private async resolveAndLinkDonorForDonation(
    createDonationDto: CreateDonationDto,
    donationId: number,
  ): Promise<Donor | null> {
    if (createDonationDto.donor_id) {
      return this.donorRepository.findOne({
        where: { id: createDonationDto.donor_id },
      });
    }

    if (!createDonationDto.donor_email || !createDonationDto.donor_phone) {
      return null;
    }

    let donor = await this.donorService.findByEmail(
      createDonationDto.donor_email,
    );

    if (donor) {
      if (donor.is_archived === true) {
        this.logger.warn(
          `Post-create donor link skipped: archived donor ${donor.email} (donation ${donationId})`,
        );
        return null;
      }
      const alreadyMultiTimeDonor = donor.multi_time_donor || false;
      if (!alreadyMultiTimeDonor) {
        donor.multi_time_donor = true;
      }
      if (createDonationDto.notification_subscription !== undefined) {
        donor.notification_subscription =
          createDonationDto.notification_subscription;
      }
      donor = await this.donorRepository.save(donor);
    } else {
      donor = await this.donorService.autoRegisterFromDonation({
        donor_name: createDonationDto.donor_name,
        donor_email: createDonationDto.donor_email,
        donor_phone: createDonationDto.donor_phone,
        city: createDonationDto.city,
        country: createDonationDto.country,
        address: createDonationDto.address,
        notification_subscription:
          createDonationDto.notification_subscription,
        recurring: this.isDonationRecurring(createDonationDto),
        recurring_consent: this.hasRecurringConsent(createDonationDto),
      });
      if (!donor) {
        donor = await this.donorService.findByEmail(
          createDonationDto.donor_email,
        );
      }
    }

    if (!donor?.id) {
      return null;
    }

    await this.donationRepository.update(donationId, { donor_id: donor.id });
    await this.syncDonationGeoFromDonorIfNeeded(donationId, donor);

    // Non-Stripe recurring ledger is created at donation create; Stripe via webhook.
    if (this.isDonationRecurring(createDonationDto)) {
      this.applyDonorRecurringConsent(donor);
      await this.donorRepository.save(donor);
    }

    return donor;
  }

  private async sendNewDonationAttemptNotifications(
    savedDonation: { id: number; amount: any; currency?: string; donation_type?: string; donation_method?: string },
    donor: { name?: string } | null,
    user: any,
  ): Promise<void> {
    try {
      const donationUsers = await this.getDonationUsers();
      const validUserIds: number[] = [];
      for (const userId of donationUsers) {
        const userExists = await this.userRepository.findOne({
          where: { id: userId, isActive: true, is_archived: false },
          select: ["id"],
        });
        if (userExists) {
          validUserIds.push(userId);
        }
      }

      if (validUserIds.length === 0) return;

      await this.notificationsService.create(
        {
          title: "New Donation Received",
          message: `A new donation attempt of ${savedDonation.amount} ${savedDonation.currency || "PKR"} has been done ${donor?.name ? ` from ${donor.name}` : ""}.`,
          type: NotificationType.DONATION,
          link: `/donations/online_donations/view/${savedDonation.id}`,
          metadata: {
            donation_id: savedDonation.id,
            amount: savedDonation.amount,
            donation_type: savedDonation.donation_type,
            donation_method: savedDonation.donation_method,
          },
        },
        validUserIds,
        user,
      );
    } catch (error: any) {
      console.error("Failed to create notifications:", error?.message);
    }
  }

  /**
   * Runs after the HTTP response for fast website checkout (donor link, progress, notifications).
   */
  async finalizeDonationPostCreate(
    donationId: number,
    createDonationDto: CreateDonationDto,
    user: any,
  ): Promise<void> {
    const savedDonation = await this.donationRepository.findOne({
      where: { id: donationId },
    });
    if (!savedDonation) {
      this.logger.warn(`finalizeDonationPostCreate: donation ${donationId} not found`);
      return;
    }

    let donor: Donor | null = null;
    if (!savedDonation.donor_id) {
      donor = await this.resolveAndLinkDonorForDonation(
        createDonationDto,
        donationId,
      );
    } else {
      donor = await this.donorRepository.findOne({
        where: { id: savedDonation.donor_id },
      });
    }

    const trackers =
      await this.progressTrackersService.findTrackersByDonationId(donationId);
    if (trackers.length === 0) {
      await this.maybeCreateProgressTrackerForNewDonation(
        createDonationDto,
        savedDonation,
        user,
      );
      await this.maybeAllocateDonationIntoBatchesForNewDonation(
        createDonationDto,
        savedDonation,
        user,
      );
    }

    if (!createDonationDto.previous_donation_id) {
      await this.sendNewDonationAttemptNotifications(
        savedDonation,
        donor,
        user,
      );
    }
  }

  /** Multiselect on `donation.appeal_id`; supports sentinel `__none__` for unlinked donations. */
  private applyDonationAppealMultiselectFilter(
    query: SelectQueryBuilder<Donation>,
    appealIds: unknown[],
  ): void {
    if (!Array.isArray(appealIds) || appealIds.length === 0) return;

    const includeNone = appealIds.some(
      (v) => v === "__none__" || v === "none" || v === null || v === "",
    );
    const numericIds = appealIds
      .map((v) => Number(v))
      .filter((n) => Number.isFinite(n) && n > 0);

    if (includeNone && numericIds.length > 0) {
      query.andWhere(
        "(donation.appeal_id IS NULL OR donation.appeal_id IN (:...appealFilterIds))",
        { appealFilterIds: numericIds },
      );
      return;
    }
    if (includeNone) {
      query.andWhere("donation.appeal_id IS NULL");
      return;
    }
    if (numericIds.length > 0) {
      query.andWhere("donation.appeal_id IN (:...appealFilterIds)", {
        appealFilterIds: numericIds,
      });
    }
  }

  private omitAppealIdFromMultiselect(
    multiselectFilters: Record<string, unknown> | null | undefined,
  ): Record<string, unknown> {
    if (!multiselectFilters || typeof multiselectFilters !== "object") {
      return {};
    }
    const { appeal_id: _appealId, ...rest } = multiselectFilters;
    return rest;
  }

  private async persistGatewayInvoiceError(
    donationId: number | undefined | null,
    message: string,
  ): Promise<void> {
    if (donationId == null || !message) return;
    await this.donationRepository.update(donationId, { err_msg: message });
  }

  private async maybeCreateProgressTrackerForNewDonation(
    createDonationDto: CreateDonationDto,
    savedDonation: { id: number },
    user: any,
  ): Promise<void> {
    if (createDonationDto.project_id === "qurbani-baraye-mustehqeen") {
      const donationItems = (createDonationDto as any).donation_items;
      if (Array.isArray(donationItems) && donationItems.length > 0) {
        let groups: Array<{
          templateId: number;
          batchParts: number;
          isBatchable: boolean;
        }> = [];
        try {
          groups = await this.deriveProgressTemplateGroupsFromDonationItems({
            donationItems,
          });
          let createdAny = false;
          for (const g of groups) {
            try {
              await this.progressTrackersService.createTrackerFromTemplate(
                {
                  template_id: g.templateId,
                  donation_id: savedDonation.id,
                  donor_visible:
                    createDonationDto.progress_tracker_donor_visible ?? true,
                  batch_parts_count: g.isBatchable ? g.batchParts : null,
                },
                user,
              );
              createdAny = true;
            } catch (e: any) {
              console.error(
                `Failed to create Qurbani progress tracker for donation ${savedDonation.id} (template ${g.templateId}):`,
                e?.message || e,
              );
            }
          }
          if (createdAny) return;
        } catch (e: any) {
          console.error(
            `Failed to derive Qurbani progress trackers from donation_items:`,
            e?.message || e,
          );
        }
      }
    }

    const templateId = createDonationDto.progress_workflow_template_id;
    if (templateId == null || templateId === undefined) return;
    const tid = Number(templateId);
    if (!Number.isFinite(tid) || tid <= 0) return;
    try {
      await this.progressTrackersService.createTrackerFromTemplate(
        {
          template_id: tid,
          donation_id: savedDonation.id,
          donor_visible:
            createDonationDto.progress_tracker_donor_visible ?? true,
          batch_parts_count:
            (createDonationDto as any).progress_batch_parts_requested ?? null,
        },
        user,
      );
    } catch (e: any) {
      console.error(
        `Failed to create progress tracker for donation ${savedDonation.id} (template ${tid}):`,
        e?.message || e,
      );
    }
  }

  /**
   * Resolve workflow templates from `donation_items[]` for Qurbani: one row per
   * distinct template, merging quantities when the same template appears on multiple lines.
   * Prefer explicit `templateCode` / `template_code` on each item when present.
   */
  private async deriveProgressTemplateGroupsFromDonationItems(params: {
    donationItems: any[];
  }): Promise<
    Array<{
      templateId: number;
      batchParts: number;
      isBatchable: boolean;
    }>
  > {
    if (
      !Array.isArray(params?.donationItems) ||
      params.donationItems.length === 0
    ) {
      return [];
    }

    const initiativeTitleToTemplateCode: Record<string, string> = {
      "cow share": "cow_share",
      cowshare: "cow_share",
      "full cow": "cow",
      cow: "cow",
      goat: "goat",
    };

    const initiativeIdSuffixToTemplateCode: Record<string, string> = {
      "1": "cow_share",
      "2": "cow",
      "3": "goat",
    };

    const normalize = (v: any) =>
      String(v ?? "")
        .trim()
        .toLowerCase();

    const normalizeCode = (v: any) => {
      const s = String(v ?? "").trim();
      if (!s) return "";
      return s.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
    };

    const byTemplateId = new Map<
      number,
      { template: ProgressWorkflowTemplate; quantity: number }
    >();

    for (const item of params.donationItems) {
      const initiativeId = normalize(item?.initiativeId);
      const initiativeTitle = normalize(item?.initiativeTitle);
      const initiativeSubtitle = normalize(item?.initiativeSubtitle);
      const quantityRaw = item?.quantity;
      const quantity = Number(quantityRaw);

      if (!Number.isFinite(quantity) || quantity <= 0) continue;

      let templateCode = normalizeCode(item?.templateCode);
      if (!templateCode) templateCode = normalizeCode(item?.template_code);

      if (!templateCode) {
        const titleKey = initiativeTitle || initiativeSubtitle;
        const templateCodeFromTitle = titleKey
          ? initiativeTitleToTemplateCode[titleKey]
          : undefined;

        const suffixMatch = initiativeId.match(/-(\d+)$/);
        const templateCodeFromSuffix = suffixMatch
          ? initiativeIdSuffixToTemplateCode[String(suffixMatch[1])]
          : undefined;

        templateCode = templateCodeFromTitle || templateCodeFromSuffix || "";
      }

      if (!templateCode) continue;

      let template = await this.workflowTemplatesRepo.findOne({
        where: { code: templateCode, is_archived: false } as any,
      });
      if (!template) {
        template = await this.workflowTemplatesRepo.findOne({
          where: {
            code: templateCode.replace(/-/g, "_"),
            is_archived: false,
          } as any,
        });
      }
      if (!template?.id) continue;

      const addQty = Math.floor(quantity);
      const prev = byTemplateId.get(template.id);
      if (prev) {
        prev.quantity += addQty;
      } else {
        byTemplateId.set(template.id, {
          template,
          quantity: addQty,
        });
      }
    }

    return Array.from(byTemplateId.entries())
      .sort((a, b) => a[0] - b[0])
      .map(([, v]) => ({
        templateId: v.template.id,
        batchParts: v.quantity,
        isBatchable: Boolean((v.template as any).is_batchable),
      }));
  }

  /**
   * Qurbani-only: set `progress_workflow_template_id` (and batch parts when applicable)
   * from `template_code` when `donation_items` is omitted. When `donation_items` is present,
   * trackers are created per line / per template in `maybeCreateProgressTrackerForNewDonation`.
   */
  private async applyQurbaniProgressTemplateFromPayload(
    createDonationDto: CreateDonationDto,
  ): Promise<void> {
    if (createDonationDto.project_id !== "qurbani-barai-mustehqeen") return;
    if (createDonationDto.progress_workflow_template_id != null) return;

    const donationItems = (createDonationDto as any).donation_items;
    if (Array.isArray(donationItems) && donationItems.length > 0) {
      return;
    }

    const raw = String(createDonationDto.template_code ?? "").trim();
    if (!raw) return;

    try {
      let template = await this.workflowTemplatesRepo.findOne({
        where: { code: raw, is_archived: false } as any,
      });
      if (!template) {
        const normalized = raw.toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
        template = await this.workflowTemplatesRepo.findOne({
          where: { code: normalized, is_archived: false } as any,
        });
      }
      if (!template?.id) return;

      createDonationDto.progress_workflow_template_id = template.id;

      if (template.is_batchable) {
        const cfg = await this.progressBatchesService.getBatchingConfig(
          template.id,
        );
        const parts = this.derivePartsRequestedForBatchableTemplate({
          partsRequestedRaw: createDonationDto.progress_batch_parts_requested,
          amount: createDonationDto.amount,
          batchPartAmount: Number(cfg.batch_part_amount || 0),
        });
        createDonationDto.progress_batch_parts_requested = parts;
      }
    } catch (e: any) {
      console.error(
        "Failed to resolve progress template from template_code:",
        e?.message || e,
      );
    }
  }

  private derivePartsRequestedForBatchableTemplate(params: {
    partsRequestedRaw?: any;
    amount?: any;
    batchPartAmount: number;
  }): number {
    const raw = params.partsRequestedRaw;
    if (raw !== undefined && raw !== null && String(raw).trim() !== "") {
      const n = Number(raw);
      if (!Number.isFinite(n) || n <= 0 || !Number.isInteger(n)) {
        throw new HttpException(
          "progress_batch_parts_requested must be a positive integer",
          400,
        );
      }
      return n;
    }

    if (params.amount === undefined || params.amount === null) {
      throw new HttpException(
        "Explicit batch parts count is required when amount is not available for this allocation",
        400,
      );
    }
    const amount = Number(params.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      throw new HttpException(
        "Amount is required to derive batch parts for a batchable template",
        400,
      );
    }
    const partAmount = Number(params.batchPartAmount);
    if (!Number.isFinite(partAmount) || partAmount <= 0) {
      throw new HttpException("Invalid batch_part_amount on template", 400);
    }
    const parts = amount / partAmount;
    if (!Number.isFinite(parts) || parts <= 0 || !Number.isInteger(parts)) {
      throw new HttpException(
        "Donation amount must be an exact multiple of batch_part_amount, or provide progress_batch_parts_requested",
        400,
      );
    }
    return parts;
  }

  private async maybeAllocateDonationIntoBatchesForNewDonation(
    createDonationDto: CreateDonationDto,
    savedDonation: { id: number },
    user: any,
  ): Promise<void> {
    try {
      const trackers =
        await this.progressTrackersService.findTrackersByDonationId(
          savedDonation.id,
        );

      if (trackers.length > 0) {
        const multi = trackers.length > 1;
        for (const tr of trackers) {
          const tid = Number(tr.template_id);
          if (!Number.isFinite(tid) || tid <= 0) continue;
          const cfg = await this.progressBatchesService.getBatchingConfig(tid);
          if (!cfg.is_batchable) continue;
          const already =
            await this.progressBatchesService.hasAllocationsForDonationTemplate(
              savedDonation.id,
              tid,
            );
          if (already) continue;
          let partsRequested: number;
          try {
            partsRequested = this.derivePartsRequestedForBatchableTemplate({
              partsRequestedRaw: tr.batch_parts_count,
              amount: multi ? undefined : createDonationDto.amount,
              batchPartAmount: Number(cfg.batch_part_amount || 0),
            });
          } catch (e: any) {
            console.error(
              `TEST batch allocate skipped for donation ${savedDonation.id} template ${tid}:`,
              e?.message || e,
            );
            continue;
          }
          await this.progressBatchesService.allocateDonationIntoBatches({
            template_id: tid,
            donation_id: savedDonation.id,
            parts_requested: partsRequested,
            currentUser: user,
          });
          await this.progressTrackersService.syncBatchScopedStepsForDonationTemplate(
            savedDonation.id,
            tid,
            user,
          );
        }
        return;
      }

      const templateId = createDonationDto.progress_workflow_template_id;
      if (templateId == null || templateId === undefined) return;
      const tid = Number(templateId);
      if (!Number.isFinite(tid) || tid <= 0) return;

      const cfg = await this.progressBatchesService.getBatchingConfig(tid);
      if (!cfg.is_batchable) return;

      const partsRequested = this.derivePartsRequestedForBatchableTemplate({
        partsRequestedRaw: (createDonationDto as any)
          .progress_batch_parts_requested,
        amount: createDonationDto.amount,
        batchPartAmount: Number(cfg.batch_part_amount || 0),
      });

      await this.progressBatchesService.allocateDonationIntoBatches({
        template_id: tid,
        donation_id: savedDonation.id,
        parts_requested: partsRequested,
        currentUser: user,
      });
      await this.progressTrackersService.syncBatchScopedStepsForDonationTemplate(
        savedDonation.id,
        tid,
        user,
      );
    } catch (e: any) {
      console.error(
        `maybeAllocateDonationIntoBatchesForNewDonation failed for donation ${savedDonation.id}:`,
        e?.message || e,
      );
    }
  }

  private async processDonationBatchingAfterPaymentSuccess(params: {
    donationId: number;
    currentUser?: any;
    source?: string;
  }): Promise<{
    processed: boolean;
    reason?: string;
    allocationsCreated?: number;
  }> {
    const donation = await this.donationRepository.findOne({
      where: { id: params.donationId } as any,
    });
    if (!donation) throw new NotFoundException("Donation not found");

    if (String(donation.status || "").toLowerCase() !== "completed") {
      return { processed: false, reason: "Donation not completed" };
    }

    const trackers =
      await this.progressTrackersService.findTrackersByDonationId(donation.id);
    if (trackers.length === 0) {
      return { processed: false, reason: "No progress tracker for donation" };
    }

    const multi = trackers.length > 1;
    let allocationsCreated = 0;

    for (const tracker of trackers) {
      const tid =
        tracker?.template_id != null ? Number(tracker.template_id) : NaN;
      if (!Number.isFinite(tid) || tid <= 0) continue;

      let cfg: { is_batchable: boolean; batch_parts: number | null; batch_part_amount: number | null };
      try {
        cfg = await this.progressBatchesService.getBatchingConfig(tid);
      } catch {
        continue;
      }
      if (!cfg.is_batchable) continue;

      const alreadyForTemplate =
        await this.progressBatchesService.hasAllocationsForDonationTemplate(
          donation.id,
          tid,
        );
      if (alreadyForTemplate) continue;

      let partsRequested: number;
      try {
        partsRequested = this.derivePartsRequestedForBatchableTemplate({
          partsRequestedRaw: tracker?.batch_parts_count ?? null,
          amount: multi ? undefined : donation.amount,
          batchPartAmount: Number(cfg.batch_part_amount || 0),
        });
      } catch (e: any) {
        console.error(
          `Payment batch allocate skipped for donation ${donation.id} template ${tid}:`,
          e?.message || e,
        );
        continue;
      }

      const allocations =
        await this.progressBatchesService.allocateDonationIntoBatches({
          template_id: tid,
          donation_id: donation.id,
          parts_requested: partsRequested,
          currentUser: params.currentUser,
        });
      allocationsCreated += allocations.length;
      await this.progressTrackersService.syncBatchScopedStepsForDonationTemplate(
        donation.id,
        tid,
        params.currentUser,
      );
    }

    if (allocationsCreated === 0) {
      return {
        processed: false,
        reason: multi
          ? "No new batch allocations for any tracker"
          : "No batch allocation created",
      };
    }

    return { processed: true, allocationsCreated };
  }

  async processBatchingForDonationManual(donationId: number, user: any) {
    return this.processDonationBatchingAfterPaymentSuccess({
      donationId,
      currentUser: user,
      source: "manual",
    });
  }

  // /** Reuse same-day pending donation for existing donor (same amount, method, campaign). */
  // private async findReusablePendingDonation(params: {
  //   donorId: number;
  //   amount: number;
  //   donationMethod: string;
  //   campaignId: number | null;
  // }): Promise<Donation | null> {
  //   const qb = this.donationRepository
  //     .createQueryBuilder('d')
  //     .where('d.donor_id = :donorId', { donorId: params.donorId })
  //     .andWhere('d.status = :status', { status: 'pending' })
  //     .andWhere('d.amount = :amount', { amount: params.amount })
  //     .andWhere('d.donation_method = :method', { method: params.donationMethod })
  //     .andWhere('DATE(d.date) = CURRENT_DATE');

  //   if (params.campaignId === null) {
  //     qb.andWhere('d.campaign_id IS NULL');
  //   } else {
  //     qb.andWhere('d.campaign_id = :campaignId', { campaignId: params.campaignId });
  //   }

  //   return qb.orderBy('d.id', 'DESC').getOne();
  // }

  // Get users who should receive donation notifications
  private async getDonationUsers(): Promise<number[]> {
    try {
      const users = await this.userRepository
        .createQueryBuilder("user")
        .select("user.id", "id")
        .where("user.isActive = :isActive", { isActive: true })
        .andWhere("user.is_archived = :is_archived", { is_archived: false })
        .andWhere(
          "(user.department = :dept OR user.role IN (:...roles) OR user.id = :fixedId)",
          {
            dept: Department.FUND_RAISING,
            roles: [
              UserRole.ADMIN,
              UserRole.SUPER_ADMIN,
              UserRole.SYSTEM_ADMIN,
            ],
            fixedId: 5,
          },
        )
        .getRawMany();

      return [
        ...new Set(
          users
            .map((row) => Number(row.id))
            .filter((id) => Number.isFinite(id) && id > 0),
        ),
      ];
    } catch (error) {
      console.error("Error getting donation users:", error.message);
      return [];
    }
  }

  // Helper method to map category string to enum
  private mapCategoryToEnum(category: string): DonationInKindCategory {
    const categoryMap: { [key: string]: DonationInKindCategory } = {
      clothing: DonationInKindCategory.CLOTHING,
      food: DonationInKindCategory.FOOD,
      medical: DonationInKindCategory.MEDICAL,
      educational: DonationInKindCategory.EDUCATIONAL,
      electronics: DonationInKindCategory.ELECTRONICS,
      furniture: DonationInKindCategory.FURNITURE,
      books: DonationInKindCategory.BOOKS,
      toys: DonationInKindCategory.TOYS,
      household: DonationInKindCategory.HOUSEHOLD,
      other: DonationInKindCategory.OTHER,
    };
    return categoryMap[category.toLowerCase()] || DonationInKindCategory.OTHER;
  }

  // Helper method to map condition string to enum
  private mapConditionToEnum(condition: string): DonationInKindCondition {
    const conditionMap: { [key: string]: DonationInKindCondition } = {
      new: DonationInKindCondition.NEW,
      like_new: DonationInKindCondition.LIKE_NEW,
      good: DonationInKindCondition.GOOD,
      fair: DonationInKindCondition.FAIR,
      poor: DonationInKindCondition.POOR,
    };
    return (
      conditionMap[condition.toLowerCase()] || DonationInKindCondition.GOOD
    );
  }

  /**
   * Create Meezan invoice - Reusable helper method
   * @param orderNumber - Order number (usually donation ID)
   * @param amount - Transaction amount (will be converted to paisa)
   * @param savedDonation - Optional donation entity to update (if not provided, uses dummy data)
   * @returns Promise with payment URL
   */
  async createMeezanInvoice(
    orderNumber: string | number,
    amount: number | string,
    savedDonation?: Donation,
  ): Promise<{
    paymentUrl: string;
    orderId: string;
  }> {
    try {
      const meezanUser = process.env.MEEZAN_USER;
      const meezanPass = process.env.MEEZAN_PASS;
      const meezanUrl =
        process.env.MEEZAN_URL ||
        "https://acquiring.meezanbank.com/payment/rest/";
      const baseFrontendUrl = process.env.BASE_Frontend_URL || "";

      // Validate that required credentials are present
      if (!meezanUser || !meezanPass) {
        throw new HttpException(
          "Meezan credentials not configured. Please check environment variables.",
          500,
        );
      }

      // Use dummy return URL if no donation provided
      const returnUrl = savedDonation
        ? `${baseFrontendUrl}/thanks?donation_id=${savedDonation.id}`
        : `${baseFrontendUrl}/thanks?donation_id=${orderNumber}`;

      const reqParams = new URLSearchParams({
        userName: meezanUser,
        password: meezanPass,
        orderNumber: orderNumber.toString(),
        amount: Math.round(Number(amount) * 100).toString(), // amount in minor units (PKR -> paisa), fixed precision
        currency: "586", // 586 = PKR (ISO 4217)
        returnUrl: returnUrl,
        // failUrl: returnUrl,
      });

      // Call Meezan register.do with timeout
      const response = await axios.post(`${meezanUrl}/register.do`, reqParams);
      const data = response.data;

      // Handle response - check for errors first
      if (data.errorCode || data.error) {
        throw new HttpException(
          data.errorMessage || data.error || "Meezan API error",
          400,
        );
      }

      if (!data.orderId || !data.formUrl) {
        console.error("Meezan API unexpected response:", data);
        throw new HttpException("Meezan API returned invalid response", 502);
      }

      // Update donation if provided
      if (savedDonation) {
        savedDonation.orderId = data.orderId;
        await this.donationRepository.save(savedDonation);
      }

      return {
        paymentUrl: data.formUrl,
        orderId: data.orderId,
      };
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      await this.persistGatewayInvoiceError(savedDonation?.id, msg);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(`Failed to create Meezan invoice: ${msg}`, 500);
    }
  }

  /**
   * Get Meezan order status extended - Verify payment status with Meezan API
   * @param orderId - Meezan orderId (mdOrder) from registration
   * @returns Promise with order status details
   */
  async getMeezanOrderStatusExtended(orderId: string): Promise<any> {
    try {
      const meezanUser = process.env.MEEZAN_USER;
      const meezanPass = process.env.MEEZAN_PASS;
      const meezanUrl =
        process.env.MEEZAN_URL ||
        "https://acquiring.meezanbank.com/payment/rest/";

      if (!meezanUser || !meezanPass) {
        throw new HttpException(
          "Meezan credentials not configured. Please check environment variables.",
          500,
        );
      }

      const reqParams = new URLSearchParams({
        userName: meezanUser,
        password: meezanPass,
        orderId: orderId,
      });

      const response = await axios.post(
        `${meezanUrl}/getOrderStatus.do`,
        reqParams,
        { timeout: 30000 },
      );

      const data = response.data;

      if (data.errorCode || data.error) {
        throw new HttpException(
          data.errorMessage || data.error || "Meezan API error",
          400,
        );
      }

      return data;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      if (error.response) {
        throw new HttpException(
          `Meezan API error: ${error.response.data?.errorMessage || error.message}`,
          error.response.status || 502,
        );
      }
      if (error.request) {
        throw new HttpException("Meezan API timeout or network error", 503);
      }
      throw new HttpException(
        `Failed to get Meezan order status: ${error.message}`,
        500,
      );
    }
  }

  /**
   * Map Meezan orderStatus to donation status
   * @param orderStatus - Meezan orderStatus code
   * @returns Donation status string
   */
  private mapMeezanStatusToDonationStatus(orderStatus: number): string {
    // Meezan orderStatus mapping:
    // 0 → Registered, not paid → pending
    // 1 → Approved / Hold (two-phase preauth) → pending
    // 2 → Deposited (paid) → completed
    // 3 → Reversed → cancelled
    // 4 → Refunded → refunded
    // 6 → Declined → failed
    switch (orderStatus) {
      case 2:
        return "completed";
      case 3:
        return "cancelled";
      case 4:
        return "refunded";
      case 6:
        return "failed";
      case 0:
      case 1:
      default:
        return "pending";
    }
  }

  /**
   * Map PayFast status_code to donation status
   * PayFast error codes:
   *   00  → Processed OK         → completed
   *   79  → Alternate Success     → completed
   *   001 → Pending               → pending
   *   002 → Timeout               → failed
   *   54  → Card Expired          → failed
   *   97  → Insufficient Balance  → failed
   *   106 → Transaction Limit     → failed
   *   9000→ Rejected by FRMS      → failed
   *   All others                  → failed
   * @param statusCode - PayFast status_code string
   * @returns Donation status string
   */
  private mapPayfastStatusToDonationStatus(statusCode: string): string {
    switch (statusCode) {
      case "00":
      case "79":
        return "completed";
      case "001":
        return "pending";
      case "002": // timeout
      case "54": // card expired
      case "97": // insufficient balance
      case "106": // transaction limit exceeded
      case "3": // inactive account
      case "14": // incorrect details / inactive card
      case "15": // inactive card
      case "42": // invalid CNIC
      case "55": // invalid OTP/PIN
      case "75": // max PIN retries exceeded
      case "13": // invalid amount
      case "126": // invalid account details
      case "423": // unable to process
      case "41": // mismatched details
      case "9000": // rejected by FRMS
        return "failed";
      default:
        return "failed";
    }
  }

  /**
   * Unified provider status check - Detects the donation method and queries
   * the correct payment provider (PayFast, Meezan, Stripe, Blinq) for real-time status.
   * Also updates the donation record if the provider reports a different status.
   * @param donationId - Donation ID
   * @returns Provider status details + whether the DB was updated
   */
  async getProviderStatus(donationId: number): Promise<{
    donationId: number;
    provider: string;
    providerStatus: string;
    donationStatus: string;
    dbUpdated: boolean;
    details: any;
  }> {
    const donation = await this.donationRepository.findOne({
      where: { id: donationId },
      relations: ["donor"],
    });

    if (!donation) {
      throw new NotFoundException(`Donation with ID ${donationId} not found`);
    }

    const method = (donation.donation_method || "").toLowerCase();
    let providerStatus = "";
    let donationStatus = donation.status;
    let details: any = {};
    const provider = method;

    try {
      if (method === "meezan") {
        console.log("Getting Meezan status for donation:", donation.orderId);
        if (!donation.orderId) {
          return {
            donationId,
            provider,
            providerStatus: "no_order_id",
            donationStatus: donation.status,
            dbUpdated: false,
            details: {
              message:
                "No Meezan orderId found on this donation. Cannot query provider.",
            },
          };
        }
        const meezanResult = await this.getMeezanOrderStatusExtended(
          donation.orderId,
        );
        console.log("Meezan response:", meezanResult);
        // return;
        providerStatus = String(meezanResult?.OrderStatus ?? "");
        donationStatus = this.mapMeezanStatusToDonationStatus(
          Number(meezanResult?.OrderStatus),
        );
        details = {
          orderStatus: meezanResult?.OrderStatus,
          actionCode: meezanResult?.actionCode,
          amount: meezanResult?.Amount,
          currency: meezanResult?.currency,
          date: meezanResult?.date,
          orderNumber: meezanResult?.OrderNumber,
          errorCode: meezanResult?.ErrorCode,
          errorMessage: meezanResult?.ErrorMessage,
        };
      } else if (method === "stripe" || method === "stripe_embed") {
        // For Stripe, we don't have a direct status API here – return DB status
        return {
          donationId,
          provider,
          providerStatus: donation.status,
          donationStatus: donation.status,
          dbUpdated: false,
          details: {
            message:
              "Stripe status is updated via webhooks. Showing current DB status.",
          },
        };
      } else if (method === "blinq") {
        // Blinq status is callback-driven, no polling API available
        return {
          donationId,
          provider,
          providerStatus: donation.status,
          donationStatus: donation.status,
          dbUpdated: false,
          details: {
            message:
              "Blinq status is updated via callback. Showing current DB status.",
          },
        };
      } else if (method === "jazzcash") {
        if (!donation.orderId) {
          return {
            donationId,
            provider,
            providerStatus: "no_order_id",
            donationStatus: donation.status,
            dbUpdated: false,
            details: {
              message:
                "No JazzCash txn ref on this donation. Cannot query provider.",
            },
          };
        }
        const inquiry = await this.jazzcashService.inquireTransactionStatus(
          donation.orderId,
        );
        providerStatus =
          inquiry.pp_PaymentResponseCode || inquiry.pp_Status || "";
        donationStatus = inquiry.paymentCompleted
          ? "completed"
          : inquiry.pp_ResponseCode === "000"
            ? donation.status
            : "failed";
        details = {
          pp_ResponseCode: inquiry.pp_ResponseCode,
          pp_PaymentResponseCode: inquiry.pp_PaymentResponseCode,
          pp_Status: inquiry.pp_Status,
          hashVerified: inquiry.hashVerified,
        };
      } else if (method === "alfalah") {
        const orderRef = String(donation.id);
        const ipn = await this.alfalahService.getOrderStatus(orderRef);
        providerStatus = String(ipn?.TransactionStatus ?? "");
        donationStatus = this.alfalahService.isPaidStatus(providerStatus)
          ? "completed"
          : this.alfalahService.isSuccessResponseCode(ipn?.ResponseCode)
            ? "pending"
            : "failed";
        details = {
          responseCode: ipn?.ResponseCode,
          description: ipn?.Description,
          transactionId: ipn?.TransactionId,
          transactionStatus: ipn?.TransactionStatus,
          transactionAmount: ipn?.TransactionAmount,
        };
      } else {
        // Manual methods (cash, bank_transfer, cheque, in_kind, etc.)
        return {
          donationId,
          provider: method || "unknown",
          providerStatus: donation.status,
          donationStatus: donation.status,
          dbUpdated: false,
          details: {
            message: "Manual donation method – no external provider to query.",
          },
        };
      }
    } catch (error) {
      console.error(
        `Provider status check failed for donation ${donationId} (${method}):`,
        error.message,
      );
      return {
        donationId,
        provider,
        providerStatus: "error",
        donationStatus: donation.status,
        dbUpdated: false,
        details: {
          error: error.message,
          message:
            "Failed to reach payment provider. Showing current DB status.",
        },
      };
    }

    // Auto-update DB only when provider status differs from current DB status
    let dbUpdated = false;
    if (donationStatus !== donation.status) {
      const previousStatus = donation.status;
      const updateData: any = { status: donationStatus };
      if (donationStatus === "completed") {
        updateData.paid_amount = donation.amount;
      }
      // Save error message from provider (e.g. Meezan ErrorMessage / actionCodeDescription)
      if (["failed", "cancelled", "refunded"].includes(donationStatus)) {
        updateData.err_msg = details.errorMessage || null;
      }

      console.log("Update data:", updateData);
      await this.donationRepository.update(donationId, updateData);
      dbUpdated = true;
      await this.refreshDonorDonationStats(donation.donor_id);

      if (this.isSuccessfulDonationStatus(donationStatus)) {
        await this.afterSuccessfulDonationPayment(donationId);
      }

      // Dashboard aggregates removed (fundraising dashboard reads directly from main tables)
    }

    return {
      donationId,
      provider,
      providerStatus,
      donationStatus,
      dbUpdated,
      details,
    };
  }

  /**
   * Get donation by ID (for returnUrl redirect - no verification)
   * @param donationId - Donation ID
   * @returns Donation entity
   */
  async getDonationForRedirect(donationId: number): Promise<Donation> {
    const donation = await this.donationRepository.findOne({
      where: { id: donationId },
      relations: ["donor"],
    });

    if (!donation) {
      throw new NotFoundException(`Donation with ID ${donationId} not found`);
    }

    return donation;
  }

  /**
   * Get PayFast access token - Reusable helper method
   * @param basketId - Basket ID (usually donation ID)
   * @param amount - Transaction amount
   * @returns Promise with PayFast access token response
   */
  async getPayfastAccessToken(
    basketId: string,
    amount: number | string,
  ): Promise<any> {
    try {
      const payfastResponse = await this.payfastService.getAccessToken(
        basketId,
        amount,
      );
      return payfastResponse;
    } catch (error) {
      throw new HttpException(
        `Failed to get PayFast access token: ${error.message}`,
        500,
      );
    }
  }

  /**
   * Get Blinq access token - Reusable helper method
   * @returns Promise<string> - Authentication token
   */
  async getBlinqAccessToken(): Promise<string> {
    try {
      const blinq_url = "https://api.blinq.pk/";
      const authPayload = {
        ClientID: process.env.BLINQ_ID?.toString(),
        ClientSecret: process.env.BLINQ_PASS?.toString(),
      };

      if (!authPayload.ClientID || !authPayload.ClientSecret) {
        throw new HttpException("Blinq credentials not configured", 500);
      }

      const authResponse = await axios.post(
        `${blinq_url}api/Auth`,
        authPayload,
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      // Try multiple possible token locations (headers or body)
      const authToken =
        authResponse?.headers?.token ||
        authResponse?.data?.token ||
        authResponse?.data?.data?.token;

      if (!authToken) {
        console.error("Blinq auth response structure:", {
          headers: authResponse?.headers,
          data: authResponse?.data,
        });
        throw new HttpException(
          "Failed to get Blinq authentication token",
          401,
        );
      }

      return authToken;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Blinq authentication failed: ${error.message}`,
        500,
      );
    }
  }

  /**
   * Generate Blinq invoice - Reusable helper method
   * @param invoiceNumber - Invoice number (usually donation ID)
   * @param amount - Invoice amount
   * @param customerName - Customer name
   * @param authToken - Optional auth token (will fetch if not provided)
   * @returns Promise with invoice data including payment URL
   */
  async generateBlinqInvoice(
    invoiceNumber: string,
    amount: number | string,
    customerName: string = "Anonymous",
    authToken?: string,
  ): Promise<{
    paymentUrl: string;
    paymentCode: string | null;
    invoiceData: any;
  }> {
    try {
      const blinq_url = "https://api.blinq.pk/";
      const token = authToken || (await this.getBlinqAccessToken());

      // Calculate dates
      const currentDate = new Date();
      const dueDate = new Date(currentDate.getTime() + 2 * 24 * 60 * 60 * 1000); // 2 days later
      const validityDate = new Date(
        currentDate.getFullYear() + 1,
        currentDate.getMonth(),
        currentDate.getDate(),
      ); // 1 year later

      // Format dates to YYYY-MM-DD (local date, not UTC)
      const formatDate = (date: Date): string => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, "0");
        const day = String(date.getDate()).padStart(2, "0");
        return `${year}-${month}-${day}`;
      };

      const invoicePayload = [
        {
          InvoiceNumber: invoiceNumber,
          InvoiceAmount: amount.toString(),
          InvoiceDueDate: formatDate(dueDate),
          ValidityDate: formatDate(validityDate),
          InvoiceType: "Service",
          IssueDate: formatDate(currentDate),
          CustomerName: customerName,
        },
      ];

      // Create invoice on Blinq
      const blinqInvoice = await axios.post(
        `${blinq_url}invoice/create`,
        invoicePayload,
        {
          headers: {
            "Content-Type": "application/json",
            token: token,
          },
        },
      );

      // Extract and validate payment URL
      const detail = blinqInvoice?.data?.ResponseDetail?.[0];
      const paymentUrl = detail?.ClickToPayUrl;
      const paymentCode = detail?.PaymentCode || null;

      if (!paymentUrl) {
        console.error("Blinq invoice unexpected response:", blinqInvoice?.data);
        throw new HttpException(
          {
            message: "Blinq invoice created but ClickToPayUrl missing",
            provider: "blinq",
            invoiceNumber: invoiceNumber,
            providerResponse: blinqInvoice?.data,
          },
          502,
        );
      }

      return {
        paymentUrl,
        paymentCode,
        invoiceData: blinqInvoice?.data,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        `Failed to create Blinq invoice: ${error.message}`,
        500,
      );
    }
  }

  /**
   * Update Meezan donation status ONLY from frontend payload (no Meezan verification).
   * Use this only if you intentionally trust the frontend for status.
   */
  async updateMeezanStatusFromPayload(
    donationId: number,
    payload: { status?: string; errorCode?: string; errorMessage?: string },
  ): Promise<{ donation: Donation; updated: boolean; message: string }> {
    const donation = await this.donationRepository.findOne({
      where: { id: donationId },
      relations: ["donor"],
    });

    if (!donation) {
      throw new NotFoundException(`Donation with ID ${donationId} not found`);
    }

    // idempotent: don't overwrite final statuses
    if (
      donation.status === "completed" ||
      donation.status === "cancelled" ||
      donation.status === "refunded"
    ) {
      return {
        donation,
        updated: false,
        message: `Donation status is already "${donation.status}". No update needed.`,
      };
    }

    const incoming = (payload?.status || "").toLowerCase();
    const nextStatus =
      incoming === "success" || incoming === "completed"
        ? "completed"
        : incoming === "failed" || incoming === "cancelled"
          ? "failed"
          : "pending";

    const updateData: any = {
      status: nextStatus,
    };

    if (nextStatus === "completed") {
      updateData.paid_amount = donation.amount;
    }

    if (payload?.errorMessage || payload?.errorCode) {
      updateData.err_msg =
        payload?.errorMessage || `Meezan errorCode: ${payload?.errorCode}`;
    }

    await this.donationRepository.update(donationId, updateData);
    const updatedDonation = await this.donationRepository.findOne({
      where: { id: donationId },
      relations: ["donor"],
    });

    if (this.isSuccessfulDonationStatus(nextStatus)) {
      await this.afterSuccessfulDonationPayment(donationId);
    }

    return {
      donation: updatedDonation,
      updated: true,
      message: `Donation status updated to "${nextStatus}"`,
    };
  }

  /**
   * Get only donation status - Calls Meezan API to get real-time status
   * This is the ONLY method that calls getMeezanOrderStatusExtended
   */
  async getDonationStatusOnly(
    donationId: number,
  ): Promise<{ donationId: number; status: string }> {
    const donation = await this.donationRepository.findOne({
      where: { id: donationId },
    });
    if (!donation) {
      throw new NotFoundException(`Donation with ID ${donationId} not found`);
    }

    // If no orderId, return current DB status
    if (!donation.orderId) {
      return { donationId, status: donation.status };
    }

    // Call Meezan API to get real-time status (ONLY place this is called)
    try {
      console.log("Getting Meezan status for donation:", donation.orderId);
      const meezanStatus = await this.getMeezanOrderStatusExtended(
        donation.orderId,
      );
      const orderStatus = meezanStatus.orderStatus;
      const realTimeStatus = this.mapMeezanStatusToDonationStatus(orderStatus);

      return { donationId, status: realTimeStatus };
    } catch (error) {
      // If Meezan API fails, return current DB status
      console.error(
        `Failed to get Meezan status for donation ${donationId}:`,
        error.message,
      );
      return { donationId, status: donation.status };
    }
  }

  async create(
    createDonationDto: CreateDonationDto,
    user: any,
  ): Promise<{ data: any; donationId: number; deferPostCreate: boolean }> {
    try {
      const manualDonationMethodOptions =
        DonationsService.MANUAL_DONATION_METHODS as readonly string[];
      console.log("createDonationDto", createDonationDto);

      const deferPostCreate =
        this.shouldDeferDonorPostCreate(createDonationDto);

      this.assertRecurringDonationPayload(createDonationDto);

      await this.applyQurbaniProgressTemplateFromPayload(createDonationDto);

      let donorId: number | null = createDonationDto.donor_id || null;
      let donor: any;
      let savedDonation: any;
      let recurringRowId = 0;

      if (!createDonationDto?.previous_donation_id) {
        if (Number(createDonationDto?.amount) < 50) {
          throw new HttpException("Donation amount is less than 50 PKR", 400);
        }

        if (deferPostCreate) {
          if (createDonationDto.donor_email) {
            await this.assertDonorNotArchivedByEmail(
              createDonationDto.donor_email,
            );
          }
        } else if (donorId) {
          // Explicit donor_id (staff): use as-is only.
        } else if (
          createDonationDto.donor_email &&
          createDonationDto.donor_phone
        ) {
          console.log(
            `🔍 Checking if donor exists: ${createDonationDto.donor_email} / ${createDonationDto.donor_phone}`,
          );

          donor = await this.donorService.findByEmail(
            createDonationDto.donor_email,
          );

          if (donor) {
            const alreadyMultiTimeDonor = donor?.multi_time_donor || false;
            if (!alreadyMultiTimeDonor) {
              donor.multi_time_donor = true;
              await this.donorRepository.save(donor);
            }
            if (createDonationDto.notification_subscription !== undefined) {
              donor.notification_subscription =
                createDonationDto.notification_subscription;
              await this.donorRepository.save(donor);
            }
            donorId = donor.id;
            if (donor?.is_archived === true) {
              throw new HttpException("Donor is archived", 400);
            }
          } else {
            donor = await this.donorService.autoRegisterFromDonation({
              donor_name: createDonationDto.donor_name,
              donor_email: createDonationDto.donor_email,
              donor_phone: createDonationDto.donor_phone,
              city: createDonationDto.city,
              country: createDonationDto.country,
              address: createDonationDto?.address,
              notification_subscription:
                createDonationDto.notification_subscription,
              recurring: this.isDonationRecurring(createDonationDto),
              recurring_consent: this.hasRecurringConsent(createDonationDto),
            });

            if (donor) {
              donorId = donor.id;
            }
          }
        }

        const campaignId: number | null =
          createDonationDto?.campaign_id ?? null;
        if (campaignId) {
          try {
            const campaign = await this.campaignsService.findOne(campaignId);
            const isAdmin = user?.role === "admin";
            if (!this.campaignsService.canAcceptDonation(campaign, isAdmin)) {
              throw new HttpException(
                `Campaign "${campaign.title}" is not accepting donations (status: ${campaign.status})`,
                400,
              );
            }
          } catch (e) {
            if (e instanceof HttpException) throw e;
            throw new HttpException("Campaign not found", 404);
          }
        }

        // Non-Stripe recurring uses recurring_donations ledger (created after save).
        // Stripe subscriptions are created by webhook. Skip legacy plan table.

        const geoSnapshot = buildDonationGeoSnapshotForCreate(
          {
            country: createDonationDto.country,
            city: createDonationDto.city,
            address: createDonationDto.address,
          },
          donor,
        );

        const manualRecurringIntent =
          this.buildManualRecurringIntent(createDonationDto);

        // Do not spread website-only / nested DTO fields onto the donation row
        const {
          enroll_manual_recurring: _enrollManual,
          campaign_pledge_lines: _pledgeLines,
          pledge_mode: _pledgeMode,
          prepaid_months: _prepaidMonths,
          prepaid_periods: _prepaidPeriods,
          recurring: _recurring,
          recurring_consent: _recurringConsent,
          donation_items: _donationItems,
          in_kind_items: _inKindItems,
          ...donationColumns
        } = createDonationDto as CreateDonationDto & Record<string, unknown>;

        const donation = this.donationRepository.create({
          ...donationColumns,
          ...geoSnapshot,
          donor_id: donorId,
          campaign_id: campaignId,
          created_by: this.donationAuditUserId(user) as any,
          recurrence_id: recurringRowId,
          // Intent stored + activated while pending (for now)
          manual_recurring_intent: manualRecurringIntent,
        });
        savedDonation = await this.donationRepository.save(donation);
        console.log(
          `💾 Donation saved with donor_id: ${donorId || "null"} (Donation ID: ${savedDonation.id})`,
        );
        await this.syncDonorLastDonationDate(savedDonation);
        if (this.isSuccessfulDonationStatus(savedDonation.status)) {
          await this.advanceDonorPipelineIfDonationCompleted(savedDonation.id);
        }

        // Prepaid campaign pledge (manual_recurring_pledges) — optional
        if (manualRecurringIntent && donorId) {
          await this.activateManualRecurringAfterSuccessfulPayment(
            savedDonation.id,
          );
        }

        // Non-Stripe recurring → Recurring Donations list (cron reminders; Stripe auto-charges)
        await this.ensureNonStripeRecurringLedgerSubscription(
          createDonationDto,
          savedDonation,
          donorId,
        );

        if (!deferPostCreate) {
          await this.maybeCreateProgressTrackerForNewDonation(
            createDonationDto,
            savedDonation,
            user,
          );
          await this.maybeAllocateDonationIntoBatchesForNewDonation(
            createDonationDto,
            savedDonation,
            user,
          );
        }
      } else {
        // Website payment retry: reuse existing donation row (e.g. pending Payfast) — do not create a duplicate.
        const prevRaw = createDonationDto.previous_donation_id;
        const prevId =
          typeof prevRaw === "string"
            ? parseInt(String(prevRaw).trim(), 10)
            : Number(prevRaw);
        if (!Number.isFinite(prevId) || prevId <= 0) {
          throw new BadRequestException("Invalid previous_donation_id");
        }

        savedDonation = await this.donationRepository.findOne({
          where: { id: prevId },
          relations: ["donor"],
        });
        if (!savedDonation) {
          throw new NotFoundException("Previous donation not found");
        }
        donor = (savedDonation as any).donor ?? null;
        donorId = (savedDonation as any).donor_id ?? null;

        const updatePatch: Record<string, unknown> = {};
        if (
          createDonationDto.amount != null &&
          Number.isFinite(Number(createDonationDto.amount))
        ) {
          updatePatch.amount = Number(createDonationDto.amount);
        }
        if (createDonationDto.currency != null && createDonationDto.currency !== "") {
          updatePatch.currency = createDonationDto.currency;
        }
        if (createDonationDto.donation_method != null) {
          updatePatch.donation_method = createDonationDto.donation_method;
        }
        if (createDonationDto.donation_type != null && createDonationDto.donation_type !== "") {
          updatePatch.donation_type = createDonationDto.donation_type;
        }
        if (createDonationDto.project_id != null && createDonationDto.project_id !== "") {
          updatePatch.project_id = createDonationDto.project_id;
        }
        if (createDonationDto.project_name != null && createDonationDto.project_name !== "") {
          updatePatch.project_name = createDonationDto.project_name;
        }
        if (createDonationDto.on_behalf_names !== undefined) {
          updatePatch.on_behalf_names = createDonationDto.on_behalf_names;
        }
        if (createDonationDto.donation_source != null && createDonationDto.donation_source !== "") {
          updatePatch.donation_source = createDonationDto.donation_source;
        }
        if (createDonationDto.status != null && createDonationDto.status !== "") {
          updatePatch.status = createDonationDto.status;
        }

        if (Object.keys(updatePatch).length > 0) {
          updatePatch.updated_by = this.donationAuditUserId(user);
          await this.donationRepository.update(prevId, updatePatch as any);
          savedDonation = await this.donationRepository.findOne({
            where: { id: prevId },
            relations: ["donor"],
          });
          if (!savedDonation) {
            throw new NotFoundException("Previous donation not found after update");
          }
          donor = (savedDonation as any).donor ?? donor;
          donorId = (savedDonation as any).donor_id ?? donorId;
          if (this.isSuccessfulDonationStatus(savedDonation.status)) {
            await this.advanceDonorPipelineIfDonationCompleted(savedDonation.id);
          }
        }
      }
      if (
        !deferPostCreate &&
        savedDonation &&
        !createDonationDto?.previous_donation_id
      ) {
        await this.sendNewDonationAttemptNotifications(
          savedDonation,
          donor,
          user,
        );
      }

      const donationId = savedDonation.id;
      let data: any;

      if (createDonationDto.donation_method === "meezan") {
        const meezanResult = await this.createMeezanInvoice(
          savedDonation.id,
          savedDonation.amount,
          savedDonation,
        );
        data = this.withDonationId(
          { paymentUrl: meezanResult.paymentUrl },
          donationId,
        );
      } else if (createDonationDto.donation_method === "blinq") {
        try {
          const blinqResult = await this.generateBlinqInvoice(
            savedDonation.id.toString(),
            savedDonation.amount,
            this.donorDisplayName(donor, createDonationDto),
          );
          savedDonation.orderId = blinqResult.paymentCode || null;
          await this.donationRepository.save(savedDonation);
          data = this.withDonationId(
            { paymentUrl: blinqResult.paymentUrl },
            donationId,
          );
        } catch (e) {
          await this.persistGatewayInvoiceError(
            savedDonation.id,
            e instanceof Error ? e.message : String(e),
          );
          throw e;
        }
      } else if (createDonationDto.donation_method === "payfast") {
        try {
          const payfastResponse = await this.payfastService.getAccessToken(
            savedDonation.id.toString(),
            savedDonation.amount,
          );
          data = this.withDonationId(
            {
              ...payfastResponse,
              BASKET_ID: savedDonation.id.toString(),
              TXNAMT: savedDonation.amount.toString(),
            },
            donationId,
          );
        } catch (e) {
          await this.persistGatewayInvoiceError(
            savedDonation.id,
            e instanceof Error ? e.message : String(e),
          );
          throw e;
        }
      } else if (createDonationDto.donation_method === "jazzcash") {
        try {
          data = await this.startJazzCashPayment(savedDonation, createDonationDto);
        } catch (e) {
          await this.persistGatewayInvoiceError(
            savedDonation.id,
            e instanceof Error ? e.message : String(e),
          );
          throw e;
        }
      } else if (createDonationDto.donation_method === "alfalah") {
        try {
          data = await this.startAlfalahPayment(savedDonation);
        } catch (e) {
          await this.persistGatewayInvoiceError(
            savedDonation.id,
            e instanceof Error ? e.message : String(e),
          );
          throw e;
        }
      } else if (createDonationDto.donation_method === "stripe") {
        try {
          const baseFrontendUrl = process.env.BASE_Frontend_URL || "";
          const stripeRecurring = this.resolveStripeRecurring(createDonationDto);
          const stripeResult = await this.stripeService.createCheckoutSession({
            donationId: savedDonation.id,
            amount: savedDonation.amount,
            currency: savedDonation.currency || "pkr",
            successUrl: `${baseFrontendUrl}/thanks?donation_id=${savedDonation.id}`,
            cancelUrl: `${baseFrontendUrl}/donate?cancelled=1`,
            donorEmail: donor?.email || createDonationDto.donor_email,
            donorName: this.donorDisplayName(donor, createDonationDto),
            recurring: stripeRecurring,
          });
          savedDonation.orderId = stripeResult.sessionId;
          await this.donationRepository.save(savedDonation);
          data = this.withDonationId(
            { paymentUrl: stripeResult.paymentUrl },
            donationId,
          );
        } catch (e) {
          await this.persistGatewayInvoiceError(
            savedDonation.id,
            e instanceof Error ? e.message : String(e),
          );
          throw e;
        }
      } else if (createDonationDto.donation_method === "stripe_embed") {
        try {
          const stripeRecurring = this.resolveStripeRecurring(createDonationDto);
          const embedResult =
            await this.stripeService.createPaymentIntentForEmbed({
              donationId: savedDonation.id,
              amount: savedDonation.amount,
              currency: savedDonation.currency || "pkr",
              donorEmail: donor?.email || createDonationDto.donor_email,
              donorName: this.donorDisplayName(donor, createDonationDto),
              recurring: stripeRecurring,
            });
          savedDonation.orderId =
            embedResult.subscriptionId ?? embedResult.paymentIntentId;
          await this.donationRepository.save(savedDonation);
          data = {
            clientSecret: embedResult.clientSecret,
            paymentIntentId: embedResult.paymentIntentId,
            donationId,
            ...(embedResult.subscriptionId && {
              subscriptionId: embedResult.subscriptionId,
            }),
          };
        } catch (e) {
          await this.persistGatewayInvoiceError(
            savedDonation.id,
            e instanceof Error ? e.message : String(e),
          );
          throw e;
        }
      } else if (
        manualDonationMethodOptions.includes(createDonationDto.donation_method)
      ) {
        console.log("Created manually");
        if (createDonationDto.donation_method === "in_kind") {
          if (
            createDonationDto.in_kind_items &&
            createDonationDto.in_kind_items.length > 0
          ) {
            const donationInKindRecords = [];

            for (const item of createDonationDto.in_kind_items) {
              const donationInKind = this.donationInKindRepository.create({
                donation_id: savedDonation.id.toString(),
                item_name: item.name,
                item_id: item.item_code || null,
                description: item.description || null,
                category: item.category
                  ? this.mapCategoryToEnum(item.category)
                  : DonationInKindCategory.OTHER,
                condition: item.condition
                  ? this.mapConditionToEnum(item.condition)
                  : DonationInKindCondition.GOOD,
                quantity: item.quantity,
                estimated_value: item.estimated_value || null,
                brand: item.brand || null,
                model: item.model || null,
                size: item.size || null,
                color: item.color || null,
                collection_date: new Date(item.collection_date),
                collection_location: item.collection_location || null,
                notes: item.notes || null,
              });

              donationInKindRecords.push(donationInKind);
            }

            await this.donationInKindRepository.save(donationInKindRecords);
          }

          data = savedDonation;
        } else {
          data = savedDonation;
        }
      } else {
        throw new HttpException("Invalid donation method", 400);
      }

      return { data, donationId, deferPostCreate };
    } catch (error) {
      console.log(error?.message);
      throw new Error(`Failed to create donation: ${error.message}`);
    }
  }

  async findAll(
    page = 1,
    pageSize = 10,
    sortField = "id",
    sortOrder: "ASC" | "DESC" = "DESC",
    filters: FilterPayload = {},
    hybridFilters: HybridFilter[] = [],
    multiselectFilters: any[] = [],
    relationsFilters?: Record<string, Record<string, any>>,
    user?: any,
    geoScope?: ResolvedGeographicScope | null,
    dataScope?: ResolvedDataScope | null,
  ) {
    try {
      const restrictedEmails = [
        "mtjf_agency@example.com",
        "musna@mtjfoundation.org",
      ];
      console.log("user email in donation listing", user?.email);
      console.log("multiselectFilters", multiselectFilters);
      const entitySearchFields = ["city", "country", "address", "geo_search"];
      // Special filters (not donation table columns)
      const progressTemplateIdRaw = (filters as any)
        ?.progress_workflow_template_id;
      const progressTemplateId =
        progressTemplateIdRaw === null ||
        progressTemplateIdRaw === undefined ||
        progressTemplateIdRaw === ""
          ? null
          : Number(progressTemplateIdRaw);
      if ((filters as any)?.progress_workflow_template_id !== undefined) {
        // prevent applyCommonFilters() from trying to match a non-existent donation column
        delete (filters as any).progress_workflow_template_id;
      }

      const donationSourceNot = (filters as Record<string, unknown>)
        ._donation_source_not;
      if ((filters as Record<string, unknown>)._donation_source_not !== undefined) {
        delete (filters as Record<string, unknown>)._donation_source_not;
      }
      const donationListMode = this.resolveDonationListMode(
        filters,
        donationSourceNot as string | null | undefined,
      );

      const teamFilter = this.dataScopeService.parseTeamFilter(
        (filters as any)?.team_filter,
        (filters as any)?.team_filter_user_id,
      );
      if ((filters as any)?.team_filter !== undefined) {
        delete (filters as any).team_filter;
      }
      if ((filters as any)?.team_filter_user_id !== undefined) {
        delete (filters as any).team_filter_user_id;
      }
      const teamFilterActive = !!(teamFilter && teamFilter.mode && teamFilter.mode !== "all");
      let effectiveDataScope = dataScope;
      if (dataScope && teamFilterActive) {
        effectiveDataScope = await this.dataScopeService.narrowScopeWithTeamFilter(
          dataScope,
          teamFilter,
        );
      }

      // One tracker max per donation — a plain join multiplies rows and breaks
      // OFFSET/LIMIT so the first page looks like a random set of IDs.
      const query = this.donationRepository
        .createQueryBuilder("donation")
        .leftJoin("donation.donor", "donor")
        .where("donation.is_archived = false")
        .leftJoinAndMapOne(
          "donation.progress_tracker",
          ProgressTracker,
          "progress_tracker",
          `progress_tracker.id = (
            SELECT pt.id
            FROM progress_trackers pt
            WHERE pt.donation_id = donation.id
              AND pt.is_archived = false
            ORDER BY pt.id DESC
            LIMIT 1
          )`,
        )
        .addSelect("donor.name", "donor_name")
        .addSelect("donor.id", "donor_id");
      if (!restrictedEmails.includes(user?.email)) {
        query.addSelect("donor.email", "donor_email");
        query.addSelect("donor.phone", "donor_phone");
      }
      // Apply filters
      this.applyDonationSourceNotFilter(
        query,
        donationSourceNot as string | null | undefined,
      );
      // 1) Main entity search/equality/date/range
      applyCommonFilters(query, filters, entitySearchFields, "donation");
      applyHybridFilters(query, hybridFilters, "donation");

      // 1b) Progress tracking filter: any non-archived tracker for this template
      if (
        progressTemplateId &&
        Number.isFinite(progressTemplateId) &&
        progressTemplateId > 0
      ) {
        query.andWhere(
          `EXISTS (
            SELECT 1
            FROM progress_trackers pt_filter
            WHERE pt_filter.donation_id = donation.id
              AND pt_filter.is_archived = false
              AND pt_filter.template_id = :ptid
          )`,
          { ptid: progressTemplateId },
        );
      }

      // 2) Relation search (const config) using top-level search
      const RELATIONS_SEARCH: RelationsFilterConfig = {
        donor: ["name", "email", "phone"],
      };
      applyRelationsSearch(
        query,
        filters.search as any,
        RELATIONS_SEARCH,
        "donation",
      );

      // 2b) Per-relation search terms via relationsFilters.{alias}.search
      if (relationsFilters) {
        Object.entries(relationsFilters).forEach(([alias, cols]) => {
          const term = (cols as any)?.search;
          if (term && typeof term === "string") {
            const singleAliasCfg: RelationsFilterConfig = {
              [alias]: RELATIONS_SEARCH[alias] || [],
            } as any;
            applyRelationsSearch(query, term, singleAliasCfg, "donation");
          }
        });
      }

      // 3) Relation equality: normalize nested relationsFilters -> namespaced keys and apply
      const RELATIONS_EQ: RelationsFilterConfig = {
        donor: ["name", "email", "phone"],
      };
      const normalizedRelationFilters = normalizeRelationsFilters(
        relationsFilters,
        RELATIONS_EQ,
      );
      applyRelationsFilter(
        query,
        normalizedRelationFilters,
        RELATIONS_EQ,
        "donation",
      );

      // 4) Multiselect filters (ref, appeal_id, …)
      const msFiltersRaw =
        multiselectFilters && typeof multiselectFilters === "object"
          ? { ...multiselectFilters }
          : {};
      if (
        Array.isArray((msFiltersRaw as any).appeal_id) &&
        (msFiltersRaw as any).appeal_id.length > 0
      ) {
        this.applyDonationAppealMultiselectFilter(
          query,
          (msFiltersRaw as any).appeal_id,
        );
      }
      const msFiltersRest = this.omitAppealIdFromMultiselect(msFiltersRaw);
      if (Object.keys(msFiltersRest).length > 0) {
        applyMultiselectFilters(query, msFiltersRest, "donation");
      }

      if (geoScope) {
        this.geographicScopeService.applyToQuery(
          query,
          "donations",
          "donation",
          geoScope,
        );
      }

      this.applyDonationListDataScope(
        query,
        effectiveDataScope,
        donationListMode,
        geoScope,
        "",
        teamFilterActive,
      );

      const allowedSortFields = new Set([
        "id",
        "created_at",
        "updated_at",
        "date",
        "amount",
        "donation_type",
        "donation_method",
        "donation_source",
        "status",
      ]);
      const safeSortField = allowedSortFields.has(String(sortField))
        ? String(sortField)
        : "id";
      const safeSortOrder =
        String(sortOrder).toUpperCase() === "ASC" ? "ASC" : "DESC";

      // Sorting before pagination for stable pages
      if (safeSortField === "id") {
        query.orderBy("donation.id", safeSortOrder);
      } else {
        query
          .orderBy(`donation.${safeSortField}`, safeSortOrder)
          .addOrderBy("donation.id", "DESC");
      }

      // Pagination — pageSize -1 (or 0) means view all
      const viewAll = pageSize === -1 || pageSize === 0;
      if (!viewAll) {
        const skip = (page - 1) * pageSize;
        query.skip(skip).take(pageSize);
      }

      this.logFinalQuery("list", query);

      // Get paginated data + total count
      const [data, total] = await query.getManyAndCount();
      const totalPages = viewAll ? 1 : Math.ceil(total / pageSize);

      // ✅ Get SUM(amount) with same filters
      const sumQuery = this.donationRepository
        .createQueryBuilder("donation")
        .select("SUM(donation.amount)", "totalDonationAmount")
        .leftJoin("donation.donor", "donor")
        .leftJoin(
          ProgressTracker,
          "progress_tracker",
          "progress_tracker.donation_id = donation.id AND progress_tracker.is_archived = false",
        );

      // Apply same filters to keep consistent
      this.applyDonationSourceNotFilter(
        sumQuery,
        donationSourceNot as string | null | undefined,
        "Sum",
      );
      applyCommonFilters(sumQuery, filters, entitySearchFields, "donation");
      applyHybridFilters(sumQuery, hybridFilters, "donation");
      applyRelationsSearch(
        sumQuery,
        filters.search as any,
        RELATIONS_SEARCH,
        "donation",
      );
      if (relationsFilters) {
        Object.entries(relationsFilters).forEach(([alias, cols]) => {
          const term = (cols as any)?.search;
          if (term && typeof term === "string") {
            const singleAliasCfg: RelationsFilterConfig = {
              [alias]: RELATIONS_SEARCH[alias] || [],
            } as any;
            applyRelationsSearch(sumQuery, term, singleAliasCfg, "donation");
          }
        });
      }
      applyRelationsFilter(
        sumQuery,
        normalizedRelationFilters,
        RELATIONS_EQ,
        "donation",
      );
      const sumMsRaw =
        multiselectFilters && typeof multiselectFilters === "object"
          ? { ...multiselectFilters }
          : {};
      if (
        Array.isArray((sumMsRaw as any).appeal_id) &&
        (sumMsRaw as any).appeal_id.length > 0
      ) {
        this.applyDonationAppealMultiselectFilter(
          sumQuery,
          (sumMsRaw as any).appeal_id,
        );
      }
      const sumMsRest = this.omitAppealIdFromMultiselect(sumMsRaw);
      if (Object.keys(sumMsRest).length > 0) {
        applyMultiselectFilters(sumQuery, sumMsRest, "donation");
      }

      // Apply same progress template filter to sum query
      if (
        progressTemplateId &&
        Number.isFinite(progressTemplateId) &&
        progressTemplateId > 0
      ) {
        sumQuery.andWhere(
          `EXISTS (
            SELECT 1
            FROM progress_trackers pt_filter
            WHERE pt_filter.donation_id = donation.id
              AND pt_filter.is_archived = false
              AND pt_filter.template_id = :ptidSum
          )`,
          { ptidSum: progressTemplateId },
        );
      }
      if (geoScope) {
        this.geographicScopeService.applyToQuery(
          sumQuery,
          "donations",
          "donation",
          geoScope,
        );
      }
      this.applyDonationListDataScope(
        sumQuery,
        effectiveDataScope,
        donationListMode,
        geoScope,
        "Sum",
        teamFilterActive,
      );
      this.logFinalQuery("sum", sumQuery);
      const sumResult = await sumQuery.getRawOne();
      const totalDonationAmount = Number(sumResult.totalDonationAmount) || 0;

      console.log("totalDonationAmount", totalDonationAmount);

      return {
        data,
        pagination: {
          page: viewAll ? 1 : page,
          pageSize,
          total,
          totalPages,
          hasNext: viewAll ? false : page < totalPages,
          hasPrev: viewAll ? false : page > 1,
        },
        totalDonationAmount, // 👈 extra key added here
      };
    } catch (error) {
      throw new Error(`Failed to retrieve donations: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async findOne(id: number) {
    try {
      // Use createQueryBuilder to join with donor table
      const donation = await this.donationRepository
        .createQueryBuilder("donation")
        .leftJoinAndSelect("donation.donor", "donor")
        .leftJoinAndSelect("donation.created_by", "created_by")
        .leftJoinAndSelect("donation.attachments", "attachments")
        .where("donation.id = :id", { id })
        .getOne();

      if (!donation) {
        throw new NotFoundException(`Donation with ID ${id} not found`);
      }

      // if donation.donation_method is in_kind then get its all in kind items
      if (donation.donation_method === "in_kind") {
        const inKindItems = await this.findInKindByDonationId(id);
        return {
          ...donation,
          in_kind_items: inKindItems,
        };
      }
      return donation;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to retrieve donation: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  async findOneWithProgressTracker(id: number) {
    const qb = this.donationRepository
      .createQueryBuilder("donation")
      .leftJoinAndSelect("donation.donor", "donor")
      .where("donation.id = :id", { id });

    const donation = await qb.getOne();
    if (!donation) {
      throw new NotFoundException(`Donation with ID ${id} not found`);
    }

    const trackers =
      await this.progressTrackersService.getAllTrackersByDonationId(id);
    const d = donation as any;
    d.progress_trackers = trackers;
    return d;
  }

  // Get all in-kind items for a specific donation
  async getInKindItems(donationId: number) {
    try {
      return await this.donationInKindRepository.find({
        where: { donation_id: donationId.toString() },
        order: { created_at: "DESC" },
      });
    } catch (error) {
      throw new Error(`Failed to retrieve in-kind items: ${error.message}`);
    }
  }

  // Get all donation in kind records for a specific donation
  async findInKindByDonationId(donationId: number) {
    try {
      return await this.donationInKindRepository.find({
        where: { donation_id: donationId.toString() },
        order: { created_at: "DESC" },
      });
    } catch (error) {
      throw new Error(
        `Failed to retrieve donation in kind records: ${error.message}`,
      );
    }
  }

  async addAttachment(
    donationId: number,
    dto: AddDonationAttachmentDto,
    currentUser?: User | null,
  ): Promise<DonationAttachment> {
    const donation = await this.donationRepository.findOne({
      where: { id: donationId },
    });
    if (!donation) {
      throw new NotFoundException(`Donation with ID ${donationId} not found`);
    }

    const attachment = this.donationAttachmentRepository.create({
      donation,
      file_name: dto.file_name,
      file_url: dto.file_url,
      file_type: dto.file_type,
      description: dto.description || null,
      uploaded_by: currentUser || null,
    });
    return this.donationAttachmentRepository.save(attachment);
  }

  async removeAttachment(
    donationId: number,
    attachmentId: number,
  ): Promise<{ deleted: boolean }> {
    const attachment = await this.donationAttachmentRepository.findOne({
      where: { id: attachmentId },
      relations: ["donation"],
    });

    if (
      !attachment ||
      !attachment.donation ||
      Number(attachment.donation.id) !== Number(donationId)
    ) {
      throw new NotFoundException("Attachment not found for this donation");
    }

    await this.donationAttachmentRepository.remove(attachment);
    return { deleted: true };
  }

  async getDonationAuditHistory(donationId: number) {
    return this.donationAuditService.findByDonationId(donationId);
  }

  async update(
    id: number,
    updateDonationDto: UpdateDonationDto,
    user?: any,
  ) {
    try {
      const donation = await this.donationRepository.findOne({ where: { id } });
      if (!donation) {
        throw new NotFoundException(`Donation with ID ${id} not found`);
      }

      const patch = this.buildDonationPatch(updateDonationDto);
      const geoTouched =
        patch.country !== undefined ||
        patch.city !== undefined ||
        patch.address !== undefined;
      if (geoTouched) {
        Object.assign(
          patch,
          mergeDonationGeoForUpdate(
            {
              country: donation.country,
              city: donation.city,
              address: donation.address,
            },
            {
              country: patch.country as string | null | undefined,
              city: patch.city as string | null | undefined,
              address: patch.address as string | null | undefined,
            },
          ),
        );
      }
      const auditUserId = this.donationAuditUserId(user);
      if (auditUserId != null) {
        patch.updated_by = auditUserId;
      }
      const auditChanges = buildDonationFieldChanges(
        donation as unknown as Record<string, unknown>,
        patch,
      );
      if (Object.keys(patch).length > 0) {
        await this.donationRepository.update(id, patch as any);
      }
      if (auditChanges.length > 0) {
        const action = auditChanges.some((c) => c.field === "status")
          ? DonationAuditAction.STATUS_CHANGED
          : DonationAuditAction.UPDATED;
        await this.donationAuditService.log({
          donationId: id,
          action,
          source: DonationAuditSource.STAFF_UI,
          changes: auditChanges,
          performedByUserId: auditUserId,
        });
      }
      const nextStatus =
        patch.status !== undefined ? String(patch.status) : donation.status;
      if (
        this.isSuccessfulDonationStatus(nextStatus) &&
        !this.isSuccessfulDonationStatus(donation.status)
      ) {
        await this.advanceDonorPipelineIfDonationCompleted(id);
      }
      return await this.findOne(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to update donation: ${error.message}`);
    }
  }

  /** Whitelist fields for PATCH; in-kind rows are not updated here. */
  private buildDonationPatch(dto: UpdateDonationDto): Record<string, unknown> {
    const d = dto as Record<string, unknown>;
    const allowed = [
      "amount",
      "paid_amount",
      "currency",
      "date",
      "donation_type",
      "donation_method",
      "donation_source",
      "status",
      "country",
      "city",
      "address",
      "project_id",
      "project_name",
      "campaign_id",
      "sub_program_id",
      "event_id",
      "cheque_number",
      "bank_name",
      "bank",
      "transaction_id",
      "ref",
      "on_behalf_names",
    ] as const;
    const patch: Record<string, unknown> = {};
    for (const key of allowed) {
      if (d[key] === undefined) continue;
      if (
        (key === "campaign_id" ||
          key === "sub_program_id" ||
          key === "event_id") &&
        (d[key] === "" || d[key] === null)
      ) {
        patch[key] = null;
        continue;
      }
      if (key === "amount" || key === "paid_amount") {
        const n = Number(d[key]);
        if (!Number.isNaN(n)) patch[key] = Math.round(n);
        continue;
      }
      if (
        key === "campaign_id" ||
        key === "sub_program_id" ||
        key === "event_id"
      ) {
        const n = Number(d[key]);
        if (!Number.isNaN(n)) patch[key] = n;
        continue;
      }
      if (key === "on_behalf_names") {
        const v = d[key];
        patch[key] = v === "" || v === null ? null : String(v);
        continue;
      }
      if (key === "country" || key === "city" || key === "address") {
        const v = d[key];
        patch[key] = v === "" || v === null ? null : String(v);
        continue;
      }
      patch[key] = d[key];
    }
    return patch;
  }

  /**
   * Update donation internal note (and stamp noted_by)
   */
  async updateNote(id: number, note: string | null, user: any) {
    try {
      const donation = await this.donationRepository.findOne({ where: { id } });
      if (!donation) {
        throw new NotFoundException(`Donation with ID ${id} not found`);
      }

      const auditUserId = this.donationAuditUserId(user);
      const notePatch: Record<string, unknown> = {
        note: note,
        noted_by: user?.id ?? null,
      };
      if (auditUserId != null) {
        notePatch.updated_by = auditUserId;
      }
      const auditChanges = buildDonationFieldChanges(
        donation as unknown as Record<string, unknown>,
        notePatch,
      );
      await this.donationRepository.update(id, notePatch as any);
      if (auditChanges.length > 0) {
        await this.donationAuditService.log({
          donationId: id,
          action: DonationAuditAction.NOTE_UPDATED,
          source: DonationAuditSource.STAFF_UI,
          changes: auditChanges,
          performedByUserId: auditUserId,
        });
      }

      return await this.donationRepository.findOne({
        where: { id },
        relations: ["donor"],
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to update donation note: ${error.message}`);
    }
  }

  /**
   * Update donation status action
   * Only updates if the status is different from the current status
   * @param donationId - The donation ID to update
   * @param newStatus - The new status to set
   * @returns Updated donation object
   */
  async updateStatusAction(
    donationId: number,
    newStatus: string,
    user?: any,
  ) {
    try {
      // Find the donation
      const donation = await this.donationRepository.findOne({
        where: { id: donationId },
        relations: ["donor"],
      });

      if (!donation) {
        throw new NotFoundException(`Donation with ID ${donationId} not found`);
      }

      // Check if status is already the same
      if (donation.status === newStatus) {
        return {
          donation,
          updated: false,
          message: `Donation status is already "${newStatus}". No update needed.`,
        };
      }

      const auditUserId = this.donationAuditUserId(user);
      const statusPatch: Record<string, unknown> = { status: newStatus };
      if (auditUserId != null) {
        statusPatch.updated_by = auditUserId;
      }
      const auditChanges = buildDonationStatusChange(donation.status, newStatus);
      await this.donationRepository.update(donationId, statusPatch as any);
      if (auditChanges.length > 0) {
        await this.donationAuditService.log({
          donationId,
          action: DonationAuditAction.STATUS_CHANGED,
          source: DonationAuditSource.STAFF_UI,
          changes: auditChanges,
          performedByUserId: auditUserId,
        });
      }

      // Get updated donation
      const updatedDonation = await this.donationRepository.findOne({
        where: { id: donationId },
        relations: ["donor"],
      });

      if (updatedDonation?.donor_id) {
        await this.refreshDonorDonationStats(updatedDonation.donor_id);
      }

      if (this.isSuccessfulDonationStatus(newStatus)) {
        await this.afterSuccessfulDonationPayment(donationId);
      }

      console.log(
        `Donation ${donationId} status updated from "${donation.status}" to "${newStatus}"`,
      );

      // Dashboard aggregates removed (fundraising dashboard reads directly from main tables)

      return {
        donation: updatedDonation,
        updated: true,
        previousStatus: donation.status,
        newStatus: newStatus,
        message: `Donation status updated successfully from "${donation.status}" to "${newStatus}"`,
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to update donation status: ${error.message}`);
    }
  }

  async remove(id: number, user?: any) {
    try {
      const donation = await this.donationRepository.findOne({ where: { id } });
      if (!donation) {
        throw new NotFoundException(`Donation with ID ${id} not found`);
      }

      const auditUserId = this.donationAuditUserId(user);
      await this.donationAuditService.log({
        donationId: id,
        action: DonationAuditAction.DELETED,
        source: DonationAuditSource.STAFF_UI,
        changes: [
          {
            field: "record",
            old_value: "active",
            new_value: "deleted",
          },
        ],
        performedByUserId: auditUserId,
        metadata: {
          status: donation.status,
          amount: donation.amount,
          donation_source: donation.donation_source,
        },
      });

      await this.donationRepository.delete(id);
      return { message: "Donation deleted successfully" };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to delete donation: ${error.message}`);
    }
  }

  async updateDonationStatus(payload: any) {
    try {
      console.log("Updating donation status with payload:", payload);

      let donationId: string;
      let paymentMethod: string;

      // Determine payment method and extract donation ID
      if (
        payload.transaction_id &&
        payload.err_code !== undefined &&
        payload.basket_id
      ) {
        // Payfast payload format
        paymentMethod = "payfast";
        donationId = payload.basket_id;
        console.log("Processing Payfast status update");
      } else if (
        payload.payment_method &&
        (payload.payment_method === "meezan" ||
          payload.payment_method === "blinq")
      ) {
        // Meezan or Blinq payload format
        paymentMethod = payload.payment_method;
        donationId = payload.donation_id || payload.orderId || payload.order_id;
        console.log(`Processing ${paymentMethod} status update`);
      } else if (
        payload.payment_method &&
        payload.payment_method === "stripe"
      ) {
        paymentMethod = "stripe";
        donationId = payload.donation_id || payload.client_reference_id;
        console.log("Processing Stripe status update");
      } else {
        throw new Error(
          "Invalid payload format: Unable to determine payment method or donation ID",
        );
      }

      if (!donationId) {
        throw new Error("Donation ID not found in payload");
      }

      // Find the donation by ID
      const donation = await this.donationRepository.findOne({
        where: { id: parseInt(donationId) },
      });

      if (!donation) {
        throw new NotFoundException(`Donation with ID ${donationId} not found`);
      }

      // Update donation status based on payment method
      let newStatus: string;
      let updateData: any = {};

      if (paymentMethod === "payfast") {
        // Payfast status logic
        if (payload.err_code === "00" || payload.err_code === 0) {
          newStatus = "completed";
        } else {
          newStatus = "failed";
        }

        updateData = {
          status: newStatus,
          transaction_id: payload.transaction_id,
          error_code: payload.err_code,
          error_message: payload.err_msg,
        };
      } else if (paymentMethod === "meezan") {
        // Meezan status logic
        if (payload.status === "completed" || payload.status === "success") {
          newStatus = "completed";
        } else {
          newStatus = "failed";
        }

        updateData = {
          status: newStatus,
          transaction_id: payload.transaction_id,
          error_code: payload.error_code,
          error_message: payload.error_message,
        };
      } else if (paymentMethod === "blinq") {
        // Blinq status logic
        if (payload.status === "completed" || payload.status === "success") {
          newStatus = "completed";
        } else {
          newStatus = "failed";
        }

        updateData = {
          status: newStatus,
          transaction_id: payload.transaction_id,
          error_code: payload.error_code,
          error_message: payload.error_message,
        };
      } else if (paymentMethod === "stripe") {
        if (
          payload.status === "completed" ||
          payload.status === "success" ||
          payload.payment_status === "paid"
        ) {
          newStatus = "completed";
        } else {
          newStatus = "failed";
        }
        updateData = {
          status: newStatus,
          orderId: payload.order_id || payload.session_id || payload.id,
          err_msg: payload.error_message || payload.err_msg || null,
        };
      }

      // Update the donation
      await this.donationRepository.update(parseInt(donationId), updateData);

      // Dashboard aggregates removed (fundraising dashboard reads directly from main tables)

      // Get updated donation
      const updatedDonation = await this.donationRepository.findOne({
        where: { id: parseInt(donationId) },
      });

      console.log(`Donation ${donationId} status updated to: ${newStatus}`);

      return {
        donationId: parseInt(donationId),
        paymentMethod,
        newStatus,
        // updatedDonation,
      };
    } catch (error) {
      console.error("Error in updateDonationStatus:", error);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to update donation status: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // PayFast IPN Handler - Public endpoint logic
  async handlePayfastIpn(payload: any) {
    try {
      console.log("=== PAYFAST IPN RECEIVED ===");
      console.log("Full IPN Payload:", JSON.stringify(payload, null, 2));
      console.log("Timestamp:", new Date().toISOString());

      // Extract key parameters from PayFast IPN
      const {
        basket_id,
        err_code,
        validation_hash,
        transaction_id,
        order_date,
        PaymentName,
        transaction_amount,
        merchant_amount,
        err_msg,
        transaction_currency,
        mobile_no,
        masked_pan,
      } = payload;

      console.log("=== EXTRACTED PARAMETERS ===");
      console.log("Basket ID:", basket_id);
      console.log("Error Code:", err_code);
      console.log("Error Message:", err_msg);
      console.log("Validation Hash:", validation_hash);
      console.log("Transaction ID:", transaction_id);
      console.log("Order Date:", order_date);
      console.log("Payment Name:", PaymentName);
      console.log("Transaction Amount:", transaction_amount);
      console.log("Merchant Amount:", merchant_amount);

      // Validate required parameters
      if (!basket_id || !err_code || !validation_hash) {
        throw new Error("Missing required PayFast parameters");
      }

      // Find donation by basket_id (which is the donation id)
      const donation = await this.donationRepository
        .createQueryBuilder("donation")
        .leftJoinAndSelect("donation.donor", "donor")
        .where("donation.id = :id", { id: parseInt(basket_id) })
        .getOne();

      if (!donation) {
        throw new Error(
          `Donation with ID ${basket_id} not found in handlePayfastIpn`,
        );
      }

      console.log("Found donation:", {
        id: donation.id,
        amount: donation.amount,
        status: donation.status,
      });

      // Verify PayFast hash
      const hashValid = this.verifyPayfastHash(
        basket_id,
        err_code,
        validation_hash,
      );
      console.log("Hash verification result:", hashValid);

      if (!hashValid) {
        throw new Error("Invalid PayFast validation hash");
      }

      // Update donation status based on err_code
      let newStatus: string;
      if (err_code === "000" || err_code === "00") {
        // end success message and email if not sent already
        newStatus = "completed";
        console.log("Donation marked as completed");
      } else {
        newStatus = "failed";
        console.log("Donation marked as failed");

        // // Send failure email
        // await this.emailService.sendDonationFailureEmail(donation, {
        //   err_code,
        //   err_msg,
        //   transaction_id,
        //   donation_id: basket_id
        // }});
      }

      let message_sent: boolean = donation.message_sent === true;
      let email_sent: boolean = donation.email_sent === true;
      const send_message = await this.canAutoSendDonationMessage(donation);
      const send_email = await this.canAutoSendDonationEmail(donation);
      // Success thanks are sent once in afterSuccessfulDonationPayment (no double-send).
      if (err_code === "000" || err_code === "00") {
        // no-op for thanks here
      } else {
        if (send_message && donation.donor?.phone) {
          try {
            await this.whatsAppService.sendAbandonMessage({
              phoneNumber: donation.donor.phone,
              userName: donation.donor.name,
              amount: donation.amount,
              donationId: basket_id,
            });
            message_sent = true;
          } catch (err: any) {
            this.logger.warn(
              `PayFast abandon WhatsApp failed for ${basket_id}: ${err?.message || err}`,
            );
          }
        }
        if (send_email && donation.donor?.email) {
          try {
            await this.emailService.sendDonationFailureEmail(donation);
            email_sent = true;
          } catch (err: any) {
            this.logger.warn(
              `PayFast failure email failed for ${basket_id}: ${err?.message || err}`,
            );
          }
        }
      }
      // Update donation (do not set thanks flags on success — sendDonationThanksOnce owns those)
      const updatePayload: Record<string, any> = {
        orderId: transaction_id,
        status: newStatus,
        err_msg,
      };
      if (newStatus !== "completed") {
        updatePayload.message_sent = message_sent;
        updatePayload.email_sent = email_sent;
      }
      await this.donationRepository.update(parseInt(basket_id), updatePayload);

      let batching: any = null;
      if (newStatus === "completed") {
        try {
          batching = await this.processDonationBatchingAfterPaymentSuccess({
            donationId: parseInt(basket_id),
            currentUser: { id: -1 },
            source: "payfast_ipn",
          });
        } catch (e: any) {
          console.error(
            `Batching process failed for donation ${basket_id}:`,
            e?.message || e,
          );
          batching = {
            processed: false,
            reason: e?.message || "Batching failed",
          };
        }
        await this.afterSuccessfulDonationPayment(
          parseInt(basket_id, 10),
        );
      }
      await this.refreshDonorDonationStats(donation.donor_id);
      // Dashboard aggregates removed (fundraising dashboard reads directly from main tables)
      console.log(
        `Donation ${basket_id} updated successfully with status: ${newStatus}`,
      );
      console.log("=== IPN PROCESSING COMPLETE ===");

      return {
        basket_id: basket_id,
        err_code: err_code,
        transaction_id: transaction_id,
        status: newStatus,
        processed: true,
        batching,
      };
    } catch (error) {
      console.error("=== IPN PROCESSING ERROR ===");
      console.error("Error:", error instanceof Error ? error.message : String(error));
      console.error("Stack:", error instanceof Error ? error.stack : undefined);

      throw new Error(`Failed to process PayFast IPN: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  // Verify PayFast validation hash
  private verifyPayfastHash(
    basket_id: string,
    err_code: string,
    received_hash: string,
  ): boolean {
    try {
      const crypto = require("crypto");

      // Get PayFast credentials from environment
      const merchant_secret_key = process.env.PF_SECURED_KEY;
      const merchant_id = process.env.PF_MERCHANT_ID;

      if (!merchant_secret_key || !merchant_id) {
        console.error("PayFast credentials not configured");
        return false;
      }

      // Create hash string: basket_id|merchant_secret_key|merchant_id|err_code
      const hashString = `${basket_id}|${merchant_secret_key}|${merchant_id}|${err_code}`;
      console.log("Hash string:", hashString);

      // Calculate SHA256 hash
      const calculatedHash = crypto
        .createHash("sha256")
        .update(hashString)
        .digest("hex");
      console.log("Calculated hash:", calculatedHash);
      console.log("Received hash:", received_hash);

      // Compare hashes (case insensitive)
      return calculatedHash.toLowerCase() === received_hash.toLowerCase();
    } catch (error) {
      console.error("Hash verification error:", error.message);
      return false;
    }
  }

  // Public endpoint to update donation status
  async updateDonationFromPublic(id: string, order_id: string, status: string) {
    try {
      console.log(
        `Updating donation ID: ${id} with order_id: ${order_id} with status: ${status}`,
      );

      // Find donation by ID here add check if that donation is not completed already if completed then return success and not update the donation
      const donation = await this.donationRepository.findOne({
        where: { id: Number(id) },
      });

      if (!donation) {
        throw new NotFoundException(`Donation with ID ${id} not found`);
      }

      // Update only orderId and status
      await this.donationRepository.update(parseInt(id), {
        orderId: order_id,
        status: status,
      });

      console.log(
        `Donation ${id} updated successfully with order_id: ${order_id} and status: ${status}`,
      );

      return {
        id: parseInt(id),
        order_id: order_id,
        status: status,
        updated: true,
      };
    } catch (error) {
      console.error("Error updating donation from public:", error.message);
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error(`Failed to update donation: ${error.message}`);
    }
  }

  /**
   * Stripe webhook handler. Verifies signature, then updates donation on checkout.session.completed.
   * Expects raw body (Buffer) and Stripe-Signature header.
   */
  async handleStripeWebhook(
    rawBody: Buffer | string,
    signature: string,
  ): Promise<{
    received: boolean;
    donationId?: number;
    recurringDonation?: { handled: boolean; action?: string };
  }> {
    const event = this.stripeService.constructWebhookEvent(rawBody, signature);
    let resolvedDonationId: number | undefined;

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as {
        id?: string;
        client_reference_id?: string;
        payment_status?: string;
        mode?: string;
        subscription?: string;
      };
      const parsedDonationId = session.client_reference_id
        ? parseInt(session.client_reference_id, 10)
        : null;
      if (parsedDonationId && !isNaN(parsedDonationId)) {
        const donation = await this.donationRepository.findOne({
          where: { id: parsedDonationId },
        });
        if (donation) {
          resolvedDonationId = parsedDonationId;
          if (donation.status !== "completed") {
            const orderIdForDonation =
              session.mode === "subscription" && session.subscription
                ? session.subscription
                : session.id || donation.orderId;
            await this.donationRepository.update(parsedDonationId, {
              status: "completed",
              orderId: orderIdForDonation,
            });
            console.log(
              `Stripe webhook: Donation ${parsedDonationId} marked completed (${session.mode === "subscription" ? "subscription" : "session"}: ${orderIdForDonation})`,
            );
          }
        }
      }
    }
    if (event.type === "payment_intent.succeeded") {
      const paymentIntent = event.data.object as {
        id?: string;
        metadata?: { donation_id?: string };
      };
      const donationIdStr = paymentIntent.metadata?.donation_id;
      const parsedDonationId = donationIdStr
        ? parseInt(donationIdStr, 10)
        : null;
      if (parsedDonationId && !isNaN(parsedDonationId)) {
        const donation = await this.donationRepository.findOne({
          where: { id: parsedDonationId },
        });
        if (donation) {
          resolvedDonationId = parsedDonationId;
          if (donation.status !== "completed") {
            await this.donationRepository.update(parsedDonationId, {
              status: "completed",
              orderId: paymentIntent.id || donation.orderId,
            });
            console.log(
              `Stripe webhook (embed): Donation ${parsedDonationId} marked completed (payment_intent: ${paymentIntent.id})`,
            );
          }
        }
      }
    }

    let recurringDonation: { handled: boolean; action?: string } | undefined;
    try {
      const recurringResult =
        await this.recurringDonationsStripeService.handleStripeEvent(event);
      if (recurringResult.handled) {
        recurringDonation = {
          handled: true,
          action: recurringResult.action,
        };
        if (recurringResult.initialDonationId) {
          resolvedDonationId =
            resolvedDonationId ?? recurringResult.initialDonationId;
        }
      }
    } catch (recurringErr: any) {
      console.error(
        "Recurring donations Stripe handler error:",
        recurringErr?.message || recurringErr,
      );
    }

    if (resolvedDonationId) {
      const stripeDonation = await this.donationRepository.findOne({
        where: { id: resolvedDonationId },
      });
      await this.refreshDonorDonationStats(stripeDonation?.donor_id);
      if (this.isSuccessfulDonationStatus(stripeDonation?.status)) {
        await this.afterSuccessfulDonationPayment(
          resolvedDonationId,
        );
      }
    }

    return {
      received: true,
      donationId: resolvedDonationId,
      recurringDonation,
    };
  }

  // Blinq IPN Handler - Public endpoint logic
  async handleBlinqCallback(payload: any) {
    try {
      console.log("=== BLINQ CALLBACK RECEIVED ===");
      console.log("Full Callback Payload:", JSON.stringify(payload, null, 2));
      console.log("Timestamp:", new Date().toISOString());

      // Extract key parameters from Blinq callback
      const {
        data_integrity,
        paid_on,
        invoice_number,
        invoice_status,
        payment_code,
        payment_id,
        ref_number,
        paid_bank,
        amount,
        amount_paid,
        net_amount,
        txnFee,
        paid_via,
      } = payload;

      console.log("=== EXTRACTED PARAMETERS ===");
      console.log("Invoice Number:", invoice_number);
      console.log("Invoice Status:", invoice_status);
      console.log("Payment Code:", payment_code);
      console.log("Amount:", amount);
      console.log("Amount Paid:", amount_paid);
      console.log("Paid Via:", paid_via);
      console.log("Paid On:", paid_on);

      // Validate required parameters
      if (!invoice_number || !invoice_status || !data_integrity) {
        return {
          code: "01",
          message: "Missing required parameters",
          status: "failure",
          invoice_number: invoice_number || "unknown",
        };
      }

      // Verify Blinq hash
      const hashValid = this.verifyBlinqHash(invoice_number, data_integrity);
      console.log("Hash verification result:", hashValid);

      if (!hashValid) {
        return {
          code: "01",
          message: "Invalid data integrity validation",
          status: "failure",
          invoice_number: invoice_number,
        };
      }

      // Find donation by invoice_number (which should match our donation ID)
      // const donation = await this.donationRepository.findOne({
      //   where: { id: parseInt(invoice_number) }
      // });

      const donation = await this.donationRepository
        .createQueryBuilder("donation")
        .leftJoinAndSelect("donation.donor", "donor")
        .where("donation.id = :id", { id: parseInt(invoice_number) })
        .getOne();

      if (!donation) {
        return {
          code: "03",
          message: "Invoice not found",
          status: "failure",
          invoice_number: invoice_number,
        };
      }

      // Check if already paid
      if (donation.status === "completed") {
        return {
          code: "02",
          message: "Invoice already paid",
          status: "success",
          invoice_number: invoice_number,
        };
      }
      let status: any;
      let message_sent = donation.message_sent === true;
      const send_message = await this.canAutoSendDonationMessage(donation);
      let email_sent = donation.email_sent === true;
      const send_email = await this.canAutoSendDonationEmail(donation);
      // Success thanks are sent once in afterSuccessfulDonationPayment (no double-send).
      if (invoice_status == "PAID") {
        status = "completed";
      } else {
        status = "failed";
        if (send_message && donation.donor?.phone) {
          try {
            await this.whatsAppService.sendAbandonMessage({
              phoneNumber: donation.donor.phone,
              userName: donation.donor.name,
              amount: donation.amount,
              donationId: invoice_number,
            });
            message_sent = true;
          } catch (err: any) {
            this.logger.warn(
              `Blinq abandon WhatsApp failed for ${invoice_number}: ${err?.message || err}`,
            );
          }
        }
        if (send_email && donation.donor?.email) {
          try {
            await this.emailService.sendDonationFailureEmail(donation);
            email_sent = true;
          } catch (err: any) {
            this.logger.warn(
              `Blinq failure email failed for ${invoice_number}: ${err?.message || err}`,
            );
          }
        }
      }

      console.log("Found donation:", {
        id: donation.id,
        amount: donation.amount,
        status: donation.status,
      });

      // Update donation status
      const blinqUpdate: Record<string, any> = {
        orderId: payment_code,
        status: status,
        err_msg: `Paid via ${paid_via} - Bank: ${paid_bank}`,
      };
      if (status !== "completed") {
        blinqUpdate.message_sent = message_sent;
        blinqUpdate.email_sent = email_sent;
      }
      await this.donationRepository.update(parseInt(invoice_number), blinqUpdate);

      if (status === "completed") {
        await this.afterSuccessfulDonationPayment(
          parseInt(invoice_number, 10),
        );
      }

      console.log(
        `Donation ${invoice_number} updated successfully with status: completed`,
      );
      console.log("=== BLINQ CALLBACK PROCESSING COMPLETE ===");

      return {
        code: "00",
        message: "Invoice successfully marked as paid",
        status: "success",
        invoice_number: invoice_number,
      };
    } catch (error) {
      console.error("=== BLINQ CALLBACK PROCESSING ERROR ===");
      console.error("Error:", error.message);
      console.error("Stack:", error.stack);

      return {
        code: "01",
        message: "Internal server error",
        status: "failure",
        invoice_number: payload.invoice_number || "unknown",
      };
    }
  }

  // Verify Blinq data integrity hash
  private verifyBlinqHash(
    invoice_number: string,
    received_hash: string,
  ): boolean {
    try {
      const crypto = require("crypto");

      // Get Blinq callback secret from environment
      const callback_secret =
        process.env.BLINQ_CALLBACK_SECRET || process.env.BLINQ_PASS;

      if (!callback_secret) {
        console.error("Blinq callback secret not configured");
        return false;
      }

      // Step 1: Concatenate invoice_number + callback_secret
      const concatenatedString = `${invoice_number}${callback_secret}`;
      console.log("Concatenated string:", concatenatedString);

      // Step 2: Generate SHA-256 hash
      const sha256Hash = crypto
        .createHash("sha256")
        .update(concatenatedString)
        .digest("hex");
      console.log("SHA-256 hash:", sha256Hash);

      // Step 3: Convert SHA-256 result to MD5 hash
      const md5Hash = crypto.createHash("md5").update(sha256Hash).digest("hex");
      console.log("MD5 hash:", md5Hash);
      console.log("Received hash:", received_hash);

      // Step 4: Compare hashes (case insensitive)
      return md5Hash.toLowerCase() === received_hash.toLowerCase();
    } catch (error) {
      console.error("Blinq hash verification error:", error.message);
      return false;
    }
  }

  // ─── Bank Alfalah APG — credit/debit card only (page redirection) ───────────

  /**
   * JazzCash MWallet v2 — synchronous charge; IPN is backup confirmation.
   */
  private async startJazzCashPayment(
    savedDonation: Donation,
    createDonationDto: CreateDonationDto,
  ) {
    const phone = createDonationDto.donor_phone;
    const cnic = createDonationDto.jazzcash_cnic;
    if (!phone?.trim()) {
      throw new BadRequestException(
        "JazzCash requires a mobile number linked to the JazzCash wallet",
      );
    }
    if (!cnic?.trim()) {
      throw new BadRequestException(
        "JazzCash requires the last 6 digits of CNIC",
      );
    }

    const result = await this.jazzcashService.initiateMWalletPayment({
      donationId: savedDonation.id,
      amount: Number(savedDonation.amount),
      mobileNumber: phone,
      cnicLast6: cnic,
      description:
        createDonationDto.item_description ||
        createDonationDto.project_name ||
        "MTJ Foundation Donation",
    });

    const newStatus = result.success ? "completed" : "failed";
    await this.donationRepository.update(savedDonation.id, {
      orderId: result.pp_TxnRefNo,
      status: newStatus,
      transaction_id:
        result.pp_RetreivalReferenceNo ||
        result.pp_AuthCode ||
        null,
      err_msg: result.success ? null : result.pp_ResponseMessage,
    });

    if (result.success) {
      await this.afterSuccessfulDonationPayment(savedDonation.id);
    }

    return this.withDonationId(
      {
        status: newStatus,
        pp_ResponseCode: result.pp_ResponseCode,
        pp_ResponseMessage: result.pp_ResponseMessage,
        pp_TxnRefNo: result.pp_TxnRefNo,
        paymentCompleted: result.success,
      },
      savedDonation.id,
    );
  }

  async handleJazzCashIpn(payload: Record<string, unknown>) {
    this.logger.log(
      `JazzCash IPN process start payloadKeys=${Object.keys(payload || {}).join(",") || "none"} ` +
        `raw=${JSON.stringify(payload)}`,
    );

    const creds = this.jazzcashService.getCredentials();
    this.logger.log(
      `JazzCash IPN config env=${creds.env} merchantId=${creds.merchantId} ` +
        `expectedIpnUrl=${creds.ipnUrl}`,
    );

    const hashValid = verifyJazzCashSecureHash(payload, creds.integritySalt);
    this.logger.log(
      `JazzCash IPN hashVerified=${hashValid} ` +
        `pp_TxnRefNo=${payload?.pp_TxnRefNo ?? "n/a"} ` +
        `pp_ResponseCode=${payload?.pp_ResponseCode ?? "n/a"} ` +
        `pp_ResponseMessage=${payload?.pp_ResponseMessage ?? "n/a"} ` +
        `pp_Amount=${payload?.pp_Amount ?? "n/a"} ` +
        `pp_AuthCode=${payload?.pp_AuthCode ?? "n/a"} ` +
        `pp_RetreivalReferenceNo=${payload?.pp_RetreivalReferenceNo ?? payload?.pp_RetrievalReferenceNo ?? "n/a"} ` +
        `pp_BillReference=${payload?.pp_BillReference ?? "n/a"} ` +
        `pp_SecureHash=${payload?.pp_SecureHash ? String(payload.pp_SecureHash).slice(0, 12) + "..." : "n/a"}`,
    );
    if (!hashValid) {
      this.logger.error(
        `JazzCash IPN rejected: invalid secure hash payload=${JSON.stringify(payload)}`,
      );
      throw new BadRequestException("Invalid JazzCash secure hash");
    }

    const txnRef = String(payload.pp_TxnRefNo || "").trim();
    if (!txnRef) {
      this.logger.error(
        `JazzCash IPN rejected: missing pp_TxnRefNo payload=${JSON.stringify(payload)}`,
      );
      throw new BadRequestException("Missing pp_TxnRefNo in JazzCash IPN");
    }

    let donation = await this.donationRepository.findOne({
      where: { orderId: txnRef },
      relations: ["donor"],
    });
    let lookupPath = donation ? "orderId" : null;

    if (!donation) {
      // Txn format: T + YYYYMMDDHHMMSS + donationId
      const idMatch = /^T\d{14}(\d+)$/.exec(txnRef);
      const donationId = idMatch ? Number(idMatch[1]) : NaN;
      this.logger.log(
        `JazzCash IPN orderId lookup miss txnRef=${txnRef} parsedDonationId=${Number.isFinite(donationId) ? donationId : "n/a"}`,
      );
      if (Number.isFinite(donationId)) {
        donation = await this.donationRepository.findOne({
          where: { id: donationId },
          relations: ["donor"],
        });
        if (donation) lookupPath = "txnRefParsedId";
      }
    }

    if (!donation) {
      this.logger.error(
        `JazzCash IPN donation not found txnRef=${txnRef} payload=${JSON.stringify(payload)}`,
      );
      throw new NotFoundException(
        `Donation not found for JazzCash txn ${txnRef}`,
      );
    }

    const responseCode = String(payload.pp_ResponseCode || "");
    const previousStatus = donation.status;
    let newStatus = donation.status;
    // IPN: 121 = successful transaction (per JazzCash IPN guide)
    if (responseCode === "121") {
      newStatus = "completed";
    } else if (["199", "999"].includes(responseCode)) {
      newStatus = "failed";
    }

    this.logger.log(
      `JazzCash IPN mapping donationId=${donation.id} lookup=${lookupPath} ` +
        `dbStatus=${previousStatus} responseCode=${responseCode} mappedStatus=${newStatus} ` +
        `amount=${donation.amount} orderId=${donation.orderId}`,
    );

    if (newStatus !== donation.status) {
      await this.donationRepository.update(donation.id, {
        status: newStatus,
        orderId: txnRef,
        transaction_id: String(
          payload.pp_RetreivalReferenceNo ||
            payload.pp_RetrievalReferenceNo ||
            payload.pp_AuthCode ||
            donation.transaction_id ||
            "",
        ),
        err_msg:
          newStatus === "failed"
            ? String(payload.pp_ResponseMessage || "")
            : null,
      });
      await this.refreshDonorDonationStats(donation.donor_id);

      this.logger.log(
        `JazzCash IPN DB updated donationId=${donation.id} ${previousStatus} -> ${newStatus}`,
      );

      if (this.isSuccessfulDonationStatus(newStatus)) {
        await this.afterSuccessfulDonationPayment(donation.id);
      }
    } else {
      this.logger.log(
        `JazzCash IPN no DB status change donationId=${donation.id} status=${donation.status}`,
      );
    }

    const result = {
      donationId: donation.id,
      status: newStatus,
      txnRef,
    };
    this.logger.log(
      `JazzCash IPN process done ${JSON.stringify(result)}`,
    );
    return result;
  }

  buildJazzCashIpnAcknowledgement(): Record<string, string> {
    return this.jazzcashService.buildIpnAcknowledgement();
  }

  /**
   * APG card — server handshake (HS/HS/HS) then SSO form for browser POST.
   */
  private async startAlfalahPayment(savedDonation: Donation) {
    const orderRef = String(savedDonation.id);
    await this.donationRepository.update(savedDonation.id, {
      orderId: orderRef,
      status: "pending",
    });

    const handshake =
      await this.alfalahService.initiateCardHandshake(orderRef);

    const sso = this.alfalahService.buildCardSsoForm({
      authToken: handshake.authToken,
      transactionReference: orderRef,
      amount: Number(savedDonation.amount),
    });

    return {
      donationId: savedDonation.id,
      transactionReference: orderRef,
      cardStep: 2,
      formAction: sso.action,
      formFields: sso.fields,
      message: "Redirecting to Bank Alfalah secure card checkout.",
    };
  }

  async handleAlfalahListener(query: { url?: string }) {
    const statusUrl = query?.url;
    if (!statusUrl) {
      throw new BadRequestException("Missing url query parameter from APG listener");
    }
    this.logger.log(`Alfalah IPN listener received statusUrl=${statusUrl}`);
    let data: Record<string, any>;
    try {
      const response = await axios.get(statusUrl, { timeout: 60000 });
      data = this.alfalahService.parseIpnPayload(response.data);
      this.logger.log(
        `Alfalah IPN listener GET success httpStatus=${response.status} ` +
          `ResponseCode=${data?.ResponseCode ?? "n/a"} TransactionStatus=${data?.TransactionStatus ?? "n/a"} ` +
          `TransactionId=${data?.TransactionId ?? "n/a"} TransactionReferenceNumber=${data?.TransactionReferenceNumber ?? "n/a"} ` +
          `raw=${JSON.stringify(data)}`,
      );
    } catch (err: any) {
      const httpStatus = err?.response?.status;
      const responseData = err?.response?.data;
      this.logger.error(
        `Alfalah IPN listener GET failed statusUrl=${statusUrl} ` +
          `httpStatus=${httpStatus ?? "n/a"} message=${err?.message || err} ` +
          `responseBody=${
            responseData != null
              ? typeof responseData === "string"
                ? responseData
                : JSON.stringify(responseData)
              : "n/a"
          }`,
      );
      throw err;
    }
    const orderRef =
      data?.TransactionReferenceNumber ||
      this.extractAlfalahOrderIdFromIpnUrl(statusUrl);
    if (!orderRef) {
      throw new BadRequestException("Could not determine order id from APG IPN");
    }
    const sync = await this.syncAlfalahDonationFromIpn(String(orderRef), {
      source: "alfalah_listener",
      ipnPayload: data,
    });
    this.logger.log(
      `Alfalah IPN listener sync done orderRef=${orderRef} mappedStatus=${sync.status}`,
    );
    return {
      success: true,
      orderId: orderRef,
      status: sync.status,
      batching: sync.batching,
    };
  }

  async handleAlfalahReturn(query: Record<string, string>) {
    const authToken = (query.auth_token || query.AuthToken || "").trim();
    const orderRef = this.resolveAlfalahOrderRef(query);

    if (authToken && orderRef) {
      const donationId = Number(orderRef);
      if (!Number.isFinite(donationId) || donationId <= 0) {
        throw new BadRequestException(
          `Invalid donation id in Alfalah return: ${orderRef}`,
        );
      }

      const donation = await this.donationRepository.findOne({
        where: { id: donationId },
      });
      if (!donation) {
        throw new NotFoundException(`Donation ${donationId} not found`);
      }

      const sso = this.alfalahService.buildCardSsoForm({
        authToken,
        transactionReference: String(orderRef),
        amount: Number(donation.amount),
      });
      return {
        type: "card_sso_form" as const,
        donationId,
        formAction: sso.action,
        formFields: sso.fields,
      };
    }

    if (orderRef) {
      const sync = await this.syncAlfalahDonationFromIpn(String(orderRef), {
        source: "alfalah_return",
      });
      return {
        type: "status" as const,
        donationId: Number(orderRef),
        status: sync.status,
        batching: sync.batching,
      };
    }

    throw new BadRequestException(
      "Could not parse Bank Alfalah return parameters (need AuthToken + donationId, or APG order id O)",
    );
  }

  /** Order id from APG (O) or merchant query (donationId / TransactionReferenceNumber). */
  private resolveAlfalahOrderRef(query: Record<string, string>): string | null {
    const candidates = [
      query.O,
      query.o,
      query.donationId,
      query.donation_id,
      query.TransactionReferenceNumber,
      query.transactionReferenceNumber,
      query.transaction_reference_number,
      query.order_id,
      query.orderId,
      this.parseAlfalahOrderFromReturnPath(query),
    ];

    for (const raw of candidates) {
      const ref = String(raw || "").trim();
      if (!ref) continue;
      const lower = ref.toLowerCase();
      if (lower === "true" || lower === "false" || lower === "success") {
        continue;
      }
      return ref;
    }
    return null;
  }

  private parseAlfalahOrderFromReturnPath(query: Record<string, string>): string | null {
    for (const key of Object.keys(query)) {
      if (key.toUpperCase() === "O" && query[key]) {
        return query[key];
      }
    }
    const raw = query.TS || query.RC || "";
    if (typeof raw === "string" && raw.includes("O=")) {
      const m = raw.match(/O=([^/&]+)/i);
      if (m) return m[1];
    }
    return null;
  }

  private extractAlfalahOrderIdFromIpnUrl(url: string): string | null {
    try {
      const parts = url.split("/").filter(Boolean);
      return parts[parts.length - 1] || null;
    } catch {
      return null;
    }
  }

  private async syncAlfalahDonationFromIpn(
    orderRef: string,
    opts?: {
      uniqueTranId?: string;
      source?: string;
      ipnPayload?: Record<string, any>;
    },
  ): Promise<{ status: string; batching?: any }> {
    const donationId = parseInt(orderRef, 10);
    if (!Number.isFinite(donationId) || donationId <= 0) {
      throw new BadRequestException("Invalid Alfalah order reference");
    }

    const donation = await this.donationRepository
      .createQueryBuilder("donation")
      .leftJoinAndSelect("donation.donor", "donor")
      .where("donation.id = :id", { id: donationId })
      .getOne();

    if (!donation) {
      throw new NotFoundException(`Donation ${donationId} not found`);
    }

    if (donation.status === "completed") {
      this.logger.log(
        `Alfalah sync skip already completed donationId=${donationId} source=${opts?.source || "alfalah_ipn"}`,
      );
      return { status: "completed" };
    }

    let ipn = opts?.ipnPayload;
    const ipnSource = ipn ? "payload" : "getOrderStatus";
    if (!ipn) {
      this.logger.log(
        `Alfalah sync fetching order status donationId=${donationId} orderRef=${orderRef} source=${opts?.source || "alfalah_ipn"}`,
      );
      ipn = await this.alfalahService.getOrderStatus(orderRef);
    } else {
      ipn = this.alfalahService.parseIpnPayload(ipn);
      this.logger.log(
        `Alfalah sync using provided IPN payload donationId=${donationId} source=${opts?.source || "alfalah_ipn"} ` +
          `ResponseCode=${ipn?.ResponseCode ?? "n/a"} TransactionStatus=${ipn?.TransactionStatus ?? "n/a"} ` +
          `raw=${JSON.stringify(ipn)}`,
      );
    }

    const responseCode = ipn?.ResponseCode;
    const transactionStatus = ipn?.TransactionStatus;
    const paid = this.alfalahService.isPaidStatus(transactionStatus);
    const responseOk = this.alfalahService.isSuccessResponseCode(responseCode);
    const newStatus = paid
      ? "completed"
      : responseOk
        ? "pending"
        : "failed";

    this.logger.log(
      `Alfalah status mapping donationId=${donationId} orderRef=${orderRef} ipnSource=${ipnSource} ` +
        `dbStatus=${donation.status} TransactionStatus=${JSON.stringify(transactionStatus)} ` +
        `ResponseCode=${JSON.stringify(responseCode)} paid=${paid} responseOk=${responseOk} ` +
        `mappedStatus=${newStatus} Description=${ipn?.Description ?? ipn?.description ?? "n/a"}`,
    );

    const transactionId =
      opts?.uniqueTranId ||
      ipn?.TransactionId ||
      ipn?.transaction_id ||
      donation.orderId;

    let message_sent = donation.message_sent === true;
    let email_sent = donation.email_sent === true;
    const send_message = await this.canAutoSendDonationMessage(donation);
    const send_email = await this.canAutoSendDonationEmail(donation);

    // Success thanks are sent once in afterSuccessfulDonationPayment (no double-send).
    if (newStatus === "failed" && donation.donor) {
      if (send_message && donation.donor.phone) {
        try {
          await this.whatsAppService.sendAbandonMessage({
            phoneNumber: donation.donor.phone,
            userName: donation.donor.name,
            amount: donation.amount,
            donationId: orderRef,
          });
          message_sent = true;
        } catch (err: any) {
          this.logger.warn(
            `Alfalah abandon WhatsApp failed for ${donationId}: ${err?.message || err}`,
          );
        }
      }
      if (send_email && donation.donor.email) {
        try {
          await this.emailService.sendDonationFailureEmail(donation);
          email_sent = true;
        } catch (err: any) {
          this.logger.warn(
            `Alfalah failure email failed for ${donationId}: ${err?.message || err}`,
          );
        }
      }
    }

    const alfalahUpdate: Record<string, any> = {
      status: newStatus,
      orderId: String(transactionId || orderRef),
      err_msg: paid
        ? ipn?.Description || null
        : ipn?.Description || ipn?.description || "Payment not completed",
      ...(newStatus === "completed" ? { paid_amount: donation.amount } : {}),
    };
    if (newStatus !== "completed") {
      alfalahUpdate.message_sent = message_sent;
      alfalahUpdate.email_sent = email_sent;
    }
    await this.donationRepository.update(donationId, alfalahUpdate);
    this.logger.log(
      `Alfalah DB updated donationId=${donationId} status=${newStatus} orderId=${alfalahUpdate.orderId} ` +
        `err_msg=${alfalahUpdate.err_msg ?? "n/a"}`,
    );

    let batching: any = null;
    if (newStatus === "completed") {
      try {
        batching = await this.processDonationBatchingAfterPaymentSuccess({
          donationId,
          currentUser: { id: -1 },
          source: opts?.source || "alfalah_ipn",
        });
      } catch (e: any) {
        batching = { processed: false, reason: e?.message };
      }
      await this.afterSuccessfulDonationPayment(donationId);
    }

    await this.refreshDonorDonationStats(donation.donor_id);

    return { status: newStatus, batching };
  }

  async getAlfalahHandshakeHealth(): Promise<{ success: boolean; message: string }> {
    try {
      const c = this.alfalahService.getCredentials();
      this.alfalahService.buildCardHandshakeForm("0");
      return {
        success: true,
        message: `Bank Alfalah APG card configured (merchant ${c.merchantId}, channel ${c.cardChannelId})`,
      };
    } catch (e: any) {
      return {
        success: false,
        message: e?.message || "APG credentials not configured",
      };
    }
  }

  async getDonationListForDropdown(options?: {
    status?: string;
    paymentMethod?: string;
  }) {
    const queryBuilder = this.donationRepository
      .createQueryBuilder("donation")
      .leftJoin("donation.donor", "donor")
      .select([
        "donation.id",
        "donation.amount",
        "donation.status",
        "donation.payment_method",
        "donation.created_at",
        "donor.id",
        "donor.name",
      ]);

    if (options?.status) {
      queryBuilder.andWhere("donation.status = :status", {
        status: options.status,
      });
    }

    if (options?.paymentMethod) {
      queryBuilder.andWhere("donation.payment_method = :paymentMethod", {
        paymentMethod: options.paymentMethod,
      });
    }

    queryBuilder.orderBy("donation.created_at", "DESC");

    const donations = await queryBuilder.getMany();

    return donations.map((donation) => ({
      id: donation.id,
      amount: donation.amount,
      status: donation.status,
      // payment_method: donation.paymentMethod,
      created_at: donation.created_at,
      donor_id: donation.donor?.id || null,
      donor_name: donation.donor?.name || null,
    }));
  }

  /**
   * Get donation summary for a specific date range in Chart.js format
   * Supports: year, month, week, day, custom
   */
  // async getSummary(options: DateRangeOptions = {}) {
  //   try {
  //     // Calculate date range
  //     DateRangeUtil.validateOptions(options);
  //     const dateRange = DateRangeUtil.calculateDateRange(options);

  //     // Extract date-only parts (YYYY-MM-DD) to match donation.date column format
  //     // The dateRange dates are timestamps (2023-12-31T19:00:00.000Z)
  //     // But donation.date is DATE type (2025-09-24), so we need to extract just the date part
  //     const startDateOnly = dateRange.startDate.toISOString().split('T')[0]; // YYYY-MM-DD
  //     const endDateOnly = dateRange.endDate.toISOString().split('T')[0]; // YYYY-MM-DD

  //     // Generate labels based on duration type using common utility
  //     const labels = DateRangeUtil.generateLabels(dateRange.durationType, dateRange.startDate, dateRange.endDate);

  //     // Helper to create base query builder
  //     // Using date column (DATE type) instead of created_at (TIMESTAMP)
  //     // Compare DATE types with date strings (YYYY-MM-DD format)
  //     const createBaseQuery = () => {
  //       return this.donationRepository
  //         .createQueryBuilder('donation')
  //         .where('donation.date >= :startDate', { startDate: startDateOnly })
  //         .andWhere('donation.date <= :endDate', { endDate: endDateOnly });
  //     };

  //     // Get time-series data based on duration type
  //     let timeSeriesData: any[] = [];

  //     switch (dateRange.durationType) {
  //       case 'year':
  //         // Group by month
  //         timeSeriesData = await createBaseQuery()
  //           .select("TO_CHAR(donation.date, 'Mon')", 'period')
  //           .addSelect('COUNT(donation.id)', 'count')
  //           .addSelect('SUM(donation.amount)', 'totalAmount')
  //           .addSelect('SUM(donation.paid_amount)', 'totalPaidAmount')
  //           .groupBy("TO_CHAR(donation.date, 'Mon')")
  //           .addGroupBy("EXTRACT(MONTH FROM donation.date)")
  //           .orderBy("EXTRACT(MONTH FROM donation.date)", 'ASC')
  //           .getRawMany();
  //         break;

  //       case 'month':
  //         // Group by day
  //         timeSeriesData = await createBaseQuery()
  //           .select("EXTRACT(DAY FROM donation.date)", 'period')
  //           .addSelect('COUNT(donation.id)', 'count')
  //           .addSelect('SUM(donation.amount)', 'totalAmount')
  //           .addSelect('SUM(donation.paid_amount)', 'totalPaidAmount')
  //           .groupBy("EXTRACT(DAY FROM donation.date)")
  //           .orderBy("EXTRACT(DAY FROM donation.date)", 'ASC')
  //           .getRawMany();
  //         break;

  //       case 'week':
  //         // Group by day of week
  //         timeSeriesData = await createBaseQuery()
  //           .select("TO_CHAR(donation.date, 'Dy')", 'period')
  //           .addSelect("EXTRACT(DOW FROM donation.date)", 'dayNum')
  //           .addSelect('COUNT(donation.id)', 'count')
  //           .addSelect('SUM(donation.amount)', 'totalAmount')
  //           .addSelect('SUM(donation.paid_amount)', 'totalPaidAmount')
  //           .groupBy("TO_CHAR(donation.date, 'Dy')")
  //           .addGroupBy("EXTRACT(DOW FROM donation.date)")
  //           .orderBy("EXTRACT(DOW FROM donation.date)", 'ASC')
  //           .getRawMany();
  //         break;

  //       case 'custom':
  //         // Determine grouping based on range length
  //         const daysDiff = Math.ceil((dateRange.endDate.getTime() - dateRange.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;

  //         if (daysDiff <= 31) {
  //           // Group by day - date column is already DATE type
  //           timeSeriesData = await createBaseQuery()
  //             .select("donation.date", 'period')
  //             .addSelect('COUNT(donation.id)', 'count')
  //             .addSelect('SUM(donation.amount)', 'totalAmount')
  //             .addSelect('SUM(donation.paid_amount)', 'totalPaidAmount')
  //             .groupBy("donation.date")
  //             .orderBy("donation.date", 'ASC')
  //             .getRawMany();
  //         } else if (daysDiff <= 365) {
  //           // Group by week
  //           timeSeriesData = await createBaseQuery()
  //             .select("DATE_TRUNC('week', donation.date)", 'period')
  //             .addSelect('COUNT(donation.id)', 'count')
  //             .addSelect('SUM(donation.amount)', 'totalAmount')
  //             .addSelect('SUM(donation.paid_amount)', 'totalPaidAmount')
  //             .groupBy("DATE_TRUNC('week', donation.date)")
  //             .orderBy("DATE_TRUNC('week', donation.date)", 'ASC')
  //             .getRawMany();
  //         } else {
  //           // Group by month
  //           timeSeriesData = await createBaseQuery()
  //             .select("DATE_TRUNC('month', donation.date)", 'period')
  //             .addSelect('COUNT(donation.id)', 'count')
  //             .addSelect('SUM(donation.amount)', 'totalAmount')
  //             .addSelect('SUM(donation.paid_amount)', 'totalPaidAmount')
  //             .groupBy("DATE_TRUNC('month', donation.date)")
  //             .orderBy("DATE_TRUNC('month', donation.date)", 'ASC')
  //             .getRawMany();
  //         }
  //         break;
  //     }

  //     // Map data to labels
  //     const mapDataToLabels = (dataKey: string, defaultValue: number = 0): number[] => {
  //       const dataMap = new Map<string, number>();

  //       timeSeriesData.forEach(item => {
  //         const period = item.period?.toString() || '';
  //         // Handle null values - convert to 0 if null/undefined
  //         const rawValue = item[dataKey];
  //         const value = rawValue === null || rawValue === undefined ? 0 : Number(rawValue || 0);

  //         // Handle different period formats based on duration type
  //         if (dateRange.durationType === 'year') {
  //           // Period is already month abbreviation (e.g., 'Sep', 'Oct')
  //           // Use it directly to match with MONTH_NAMES_SHORT
  //           if (period && MONTH_NAMES_SHORT.includes(period)) {
  //             dataMap.set(period, value);
  //           }
  //         } else if (dateRange.durationType === 'week') {
  //           // Period is day abbreviation (e.g., 'Mon', 'Tue')
  //           const dayNum = parseInt(item.dayNum || '0', 10);
  //           if (!isNaN(dayNum) && dayNum >= 0 && dayNum <= 6) {
  //             // PostgreSQL DOW: 0=Sunday, 1=Monday, ..., 6=Saturday
  //             // We want Monday=0, so adjust: Sunday (0) -> 6, others -> dayNum-1
  //             const adjustedDay = (dayNum === 0 ? 6 : dayNum - 1);
  //             // DAY_NAMES_SHORT starts with Monday, so use adjustedDay directly
  //             if (adjustedDay >= 0 && adjustedDay < DAY_NAMES_SHORT.length) {
  //               dataMap.set(DAY_NAMES_SHORT[adjustedDay], value);
  //             }
  //           }
  //         } else if (dateRange.durationType === 'month') {
  //           // For month, period is day number as string (e.g., '1', '15', '31')
  //           const dayNum = parseInt(period || '0', 10);
  //           if (!isNaN(dayNum) && dayNum >= 1 && dayNum <= 31) {
  //             dataMap.set(dayNum.toString(), value);
  //           }
  //         } else {
  //           // For custom ranges, use the period as-is
  //           dataMap.set(period, value);
  //         }
  //       });

  //       return labels.map(label => {
  //         // For custom ranges, try to match date formats more precisely
  //         if (dateRange.durationType === 'custom') {
  //           // Convert database date to label format for matching
  //           for (const [key, value] of dataMap.entries()) {
  //             if (key && typeof key === 'string') {
  //               try {
  //                 // If key is a date string, parse it
  //                 const keyDate = new Date(key);
  //                 if (!isNaN(keyDate.getTime())) {
  //                   // Match based on date format
  //                   const labelDate = label.includes('/')
  //                     ? this.parseLabelDate(label, dateRange.startDate)
  //                     : null;

  //                   if (labelDate && keyDate.toDateString() === labelDate.toDateString()) {
  //                     return value;
  //                   }
  //                 }
  //                 // Fallback: simple string matching
  //                 if (key.includes(label) || label.includes(key)) {
  //                   return value;
  //                 }
  //               } catch (e) {
  //                 // If parsing fails, use simple string matching
  //                 if (key.includes(label) || label.includes(key)) {
  //                   return value;
  //                 }
  //               }
  //             }
  //           }
  //         }
  //         return dataMap.get(label) || defaultValue;
  //       });
  //     };

  //     // Build datasets
  //     const datasets = [
  //       {
  //         label: 'Total Amount',
  //         data: mapDataToLabels('totalAmount', 0).map(val => Math.round(val * 100) / 100),
  //       },
  //       {
  //         label: 'Total Count',
  //         data: mapDataToLabels('count', 0),
  //       },
  //       {
  //         label: 'Paid Amount',
  //         data: mapDataToLabels('totalPaidAmount', 0).map(val => Math.round(val * 100) / 100),
  //       },
  //     ];

  //     return {
  //       dateRange: {
  //         startDate: dateRange.startDate.toISOString(),
  //         endDate: dateRange.endDate.toISOString(),
  //         durationType: dateRange.durationType,
  //         description: dateRange.description,
  //       },
  //       // Main time-series chart data
  //       chart: {
  //         labels,
  //         datasets,
  //       },
  //     };
  //   } catch (error) {
  //     throw new Error(`Failed to retrieve donation summary: ${error.message}`);
  //   }
  // }

  /**
   * Helper to parse label date format (e.g., "15/3" -> Date object)
   */
  private parseLabelDate(label: string, referenceDate: Date): Date | null {
    try {
      const parts = label.split("/");
      if (parts.length === 2) {
        const day = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1; // Month is 0-indexed
        if (
          !isNaN(day) &&
          !isNaN(month) &&
          day >= 1 &&
          day <= 31 &&
          month >= 0 &&
          month <= 11
        ) {
          return new Date(referenceDate.getFullYear(), month, day);
        }
      }
    } catch (e) {
      // Ignore parsing errors
    }
    return null;
  }
}
