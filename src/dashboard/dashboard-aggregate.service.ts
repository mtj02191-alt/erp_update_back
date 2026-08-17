import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Donation } from "../donations/entities/donation.entity";
import { Donor } from "../dms/donor/entities/donor.entity";
import {
  DonationBox,
  BoxStatus,
} from "../dms/donation_box/entities/donation-box.entity";
import { DonationBoxDonation } from "../dms/donation_box/donation_box_donation/entities/donation_box_donation.entity";
import { Event } from "../dms/events/entities/event.entity";
import { Campaign } from "../dms/campaigns/entities/campaign.entity";
import { RecurringDonation } from "../donations/recurring_donations/entities/recurring-donation.entity";

/** Donation status considered "COMPLETED" */
const COMPLETED_STATUS = "completed";

@Injectable()
export class DashboardAggregateService {
  constructor(
    @InjectRepository(Donation)
    private readonly donationRepo: Repository<Donation>,
    @InjectRepository(Donor)
    private readonly donorRepo: Repository<Donor>,
    @InjectRepository(DonationBoxDonation)
    private readonly donationBoxDonationRepo: Repository<DonationBoxDonation>,
    @InjectRepository(DonationBox)
    private readonly donationBoxRepo: Repository<DonationBox>,
    @InjectRepository(Event)
    private readonly eventRepo: Repository<Event>,
    @InjectRepository(Campaign)
    private readonly campaignRepo: Repository<Campaign>,
    @InjectRepository(RecurringDonation)
    private readonly recurringDonationRepo: Repository<RecurringDonation>,
  ) {}

  /**
   * Get date range (start inclusive, end exclusive) for fundraising overview.
   * If months is set, use last N months; else if year is set use that year; else last 12 months.
   */
  private getFundraisingDateRange(query: { year?: number; months?: number }): {
    start: Date;
    end: Date;
  } {
    const now = new Date();
    let start: Date;
    let end = new Date(now);
    end.setUTCMonth(end.getUTCMonth() + 1);
    end.setUTCDate(0);
    end.setUTCHours(23, 59, 59, 999);

    if (query.months != null) {
      start = new Date(now);
      start.setUTCMonth(start.getUTCMonth() - query.months);
      start.setUTCDate(1);
      start.setUTCHours(0, 0, 0, 0);
    } else if (query.year != null) {
      start = new Date(Date.UTC(query.year, 0, 1, 0, 0, 0, 0));
      end = new Date(Date.UTC(query.year, 11, 31, 23, 59, 59, 999));
    } else {
      start = new Date(now);
      start.setUTCMonth(start.getUTCMonth() - 12);
      start.setUTCDate(1);
      start.setUTCHours(0, 0, 0, 0);
    }
    return { start, end };
  }

  /**
   * Fundraising overview: cards (totals by category), cumulative series, and raised-per-month for charts.
   * When donation-level filters are provided, computes directly from the donations table.
   * Otherwise uses precomputed aggregation tables for performance.
   */
  async getFundraisingOverview(query: {
    year?: number;
    months?: number;
    donation_type?: string;
    donation_method?: string;
    ref?: string;
    projects?: string;
    date?: string;
    start_date?: string;
    end_date?: string;
  }): Promise<{
    cards: {
      total_donations_amount: number;
      total_donations_count: number;
      individual_donors_count: number;
      corporate_donors_count: number;
      recurring_donors_count: number;
      recurring_donations_amount: number;
      recurring_donations_count: number;
      total_recurring_collection: number;
      total_pending_installments_amount: number;
      multi_time_donors_count: number;
      active_donation_boxes_count: number;
      donation_box_donations_amount: number;
      events_count: number;
      campaigns_count: number;
    };
    cumulative: Array<{
      month: string;
      month_start_date: string;
      total_cumulative: number;
    }>;
    recurring_donations_series: Array<{
      month: string;
      month_start_date: string;
      month_amount: number;
      total_cumulative: number;
    }>;
    recurring_donors_series: Array<{
      month: string;
      month_start_date: string;
      donors_count: number;
      total_cumulative: number;
    }>;
  }> {
    const MONTH_NAMES = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const formatMonth = (d: Date) =>
      MONTH_NAMES[d.getUTCMonth()] + " " + d.getUTCFullYear();

    // Date range behavior (simple):
    // - if `date` set: that day only
    // - else if start_date/end_date set: use those bounds
    // - else: use months/year fallback
    let start: Date;
    let end: Date;
    if (query.date) {
      start = new Date(query.date);
      end = new Date(query.date);
      end.setUTCDate(end.getUTCDate() + 1);
      start.setUTCHours(0, 0, 0, 0);
      end.setUTCHours(0, 0, 0, 0);
    } else if (query.start_date || query.end_date) {
      start = query.start_date
        ? new Date(query.start_date)
        : new Date("1970-01-01");
      end = query.end_date ? new Date(query.end_date) : new Date();
      start.setUTCHours(0, 0, 0, 0);
      end.setUTCHours(23, 59, 59, 999);
    } else {
      const r = this.getFundraisingDateRange({
        year: query.year,
        months: query.months,
      });
      start = r.start;
      end = r.end;
    }

    // 1) donations: completed + not archived, filter by donation.date
    const donationsAgg = await this.donationRepo
      .createQueryBuilder("d")
      .select("COALESCE(SUM(d.amount), 0)", "amount_sum")
      .addSelect("COALESCE(COUNT(d.id), 0)", "count")
      .where("d.is_archived = false")
      .andWhere("LOWER(d.status) = :status", { status: COMPLETED_STATUS })
      .andWhere("d.date BETWEEN :start AND :end", { start, end })
      .getRawOne<{ amount_sum: string; count: string }>();

    const totalDonationsAmount = Number(donationsAgg?.amount_sum ?? 0);
    const totalDonationsCount = Number(donationsAgg?.count ?? 0);

    // Cumulative series by month (donations only)
    const monthRows = await this.donationRepo
      .createQueryBuilder("d")
      .select("DATE_TRUNC('month', d.date)", "month_start")
      .addSelect("COALESCE(SUM(d.amount), 0)", "month_total")
      .where("d.is_archived = false")
      .andWhere("LOWER(d.status) = :status", { status: COMPLETED_STATUS })
      .andWhere("d.date BETWEEN :start AND :end", { start, end })
      .groupBy("month_start")
      .orderBy("month_start", "ASC")
      .getRawMany<{ month_start: Date; month_total: string }>();

    let running = 0;
    const cumulative = monthRows.map((r) => {
      const monthStart = new Date(r.month_start);
      const monthTotal = Number(r.month_total ?? 0);
      running += monthTotal;
      return {
        month: formatMonth(monthStart),
        month_start_date: monthStart.toISOString().slice(0, 10),
        total_cumulative: running,
      };
    });

    // 2) donors counts (individual / corporate / multi-time — global flags)
    const donorCounts = await this.donorRepo
      .createQueryBuilder("u")
      .select(
        "COALESCE(SUM(CASE WHEN u.donor_type = 'individual' THEN 1 ELSE 0 END), 0)",
        "individual_donors_count",
      )
      .addSelect(
        "COALESCE(SUM(CASE WHEN u.donor_type = 'csr' THEN 1 ELSE 0 END), 0)",
        "corporate_donors_count",
      )
      .addSelect(
        "COALESCE(SUM(CASE WHEN u.multi_time_donor = true THEN 1 ELSE 0 END), 0)",
        "multi_time_donors_count",
      )
      .where("u.is_archived = false")
      .getRawOne<{
        individual_donors_count: string;
        corporate_donors_count: string;
        multi_time_donors_count: string;
      }>();

    // 2b) Recurring donors + installment donations — same date range as donations cards
    const recurringInstallmentsAgg = await this.recurringDonationRepo
      .createQueryBuilder("rd")
      .select("COALESCE(SUM(rd.amount), 0)", "amount_sum")
      .addSelect("COALESCE(COUNT(rd.id), 0)", "count")
      .where("rd.is_archived = false")
      .andWhere("rd.record_type = :installment", { installment: "installment" })
      .andWhere("LOWER(COALESCE(rd.status, '')) IN (:...statuses)", {
        statuses: ["completed", "paid", "success"],
      })
      .andWhere("COALESCE(rd.paid_at, rd.created_at) BETWEEN :start AND :end", {
        start,
        end,
      })
      .getRawOne<{ amount_sum: string; count: string }>();

    const recurringDonorRows = await this.recurringDonationRepo
      .createQueryBuilder("rd")
      .select("DISTINCT rd.donor_id", "donor_id")
      .where("rd.is_archived = false")
      .andWhere("rd.donor_id IS NOT NULL")
      .andWhere(
        `(
          (rd.record_type = 'installment'
            AND LOWER(COALESCE(rd.status, '')) IN ('completed', 'paid', 'success')
            AND COALESCE(rd.paid_at, rd.created_at) BETWEEN :start AND :end)
          OR
          (rd.record_type = 'subscription'
            AND rd.created_at BETWEEN :start AND :end)
        )`,
        { start, end },
      )
      .getRawMany<{ donor_id: string }>();

    const recurringDonorsCount = recurringDonorRows.length;
    const recurringDonationsAmount = Number(
      recurringInstallmentsAgg?.amount_sum ?? 0,
    );
    const recurringDonationsCount = Number(
      recurringInstallmentsAgg?.count ?? 0,
    );
    // Alias: total collected via completed recurring installments in range
    const totalRecurringCollection = recurringDonationsAmount;

    // Pending installments: active subscriptions with no completed installment yet
    // (same meaning as Recurring Donations list "pending"), amount = pledged subscription amount
    const pendingInstallmentsAgg = await this.recurringDonationRepo
      .createQueryBuilder("rd")
      .select("COALESCE(SUM(rd.amount), 0)", "amount_sum")
      .where("rd.is_archived = false")
      .andWhere("rd.record_type = :subscription", { subscription: "subscription" })
      .andWhere("LOWER(COALESCE(rd.status, '')) IN (:...activeStatuses)", {
        activeStatuses: ["active", "past_due", "trialing"],
      })
      .andWhere("rd.created_at BETWEEN :start AND :end", { start, end })
      .andWhere(
        `NOT EXISTS (
          SELECT 1 FROM recurring_donations inst
          WHERE inst.parent_id = rd.id
            AND inst.record_type = 'installment'
            AND inst.is_archived = false
            AND LOWER(COALESCE(inst.status, '')) IN ('completed', 'paid', 'success')
        )`,
      )
      .getRawOne<{ amount_sum: string }>();

    const totalPendingInstallmentsAmount = Number(
      pendingInstallmentsAgg?.amount_sum ?? 0,
    );

    // 2c) Recurring donations monthly series (installment amounts)
    const recurringDonationMonthRows = await this.recurringDonationRepo
      .createQueryBuilder("rd")
      .select(
        "DATE_TRUNC('month', COALESCE(rd.paid_at, rd.created_at))",
        "month_start",
      )
      .addSelect("COALESCE(SUM(rd.amount), 0)", "month_amount")
      .where("rd.is_archived = false")
      .andWhere("rd.record_type = :installment", { installment: "installment" })
      .andWhere("LOWER(COALESCE(rd.status, '')) IN (:...statuses)", {
        statuses: ["completed", "paid", "success"],
      })
      .andWhere("COALESCE(rd.paid_at, rd.created_at) BETWEEN :start AND :end", {
        start,
        end,
      })
      .groupBy("month_start")
      .orderBy("month_start", "ASC")
      .getRawMany<{ month_start: Date; month_amount: string }>();

    let recurringDonationsRunning = 0;
    const recurring_donations_series = recurringDonationMonthRows.map((r) => {
      const monthStart = new Date(r.month_start);
      const monthAmount = Number(r.month_amount ?? 0);
      recurringDonationsRunning += monthAmount;
      return {
        month: formatMonth(monthStart),
        month_start_date: monthStart.toISOString().slice(0, 10),
        month_amount: monthAmount,
        total_cumulative: recurringDonationsRunning,
      };
    });

    // 2d) Recurring donors monthly series (distinct donors active that month)
    const recurringDonorMonthRows = await this.recurringDonationRepo
      .createQueryBuilder("rd")
      .select(
        `DATE_TRUNC('month', CASE
          WHEN rd.record_type = 'installment' THEN COALESCE(rd.paid_at, rd.created_at)
          ELSE rd.created_at
        END)`,
        "month_start",
      )
      .addSelect("COALESCE(COUNT(DISTINCT rd.donor_id), 0)", "donors_count")
      .where("rd.is_archived = false")
      .andWhere("rd.donor_id IS NOT NULL")
      .andWhere(
        `(
          (rd.record_type = 'installment'
            AND LOWER(COALESCE(rd.status, '')) IN ('completed', 'paid', 'success')
            AND COALESCE(rd.paid_at, rd.created_at) BETWEEN :start AND :end)
          OR
          (rd.record_type = 'subscription'
            AND rd.created_at BETWEEN :start AND :end)
        )`,
        { start, end },
      )
      .groupBy("month_start")
      .orderBy("month_start", "ASC")
      .getRawMany<{ month_start: Date; donors_count: string }>();

    let recurringDonorsRunning = 0;
    const recurring_donors_series = recurringDonorMonthRows.map((r) => {
      const monthStart = new Date(r.month_start);
      const donorsCount = Number(r.donors_count ?? 0);
      recurringDonorsRunning += donorsCount;
      return {
        month: formatMonth(monthStart),
        month_start_date: monthStart.toISOString().slice(0, 10),
        donors_count: donorsCount,
        total_cumulative: recurringDonorsRunning,
      };
    });

    // 3) donation boxes active count
    const activeDonationBoxesCount = await this.donationBoxRepo.count({
      where: { is_archived: false, is_active: true, status: BoxStatus.ACTIVE },
    });

    // 4) donation box donations sum (non-archived)
    const donationBoxAgg = await this.donationBoxDonationRepo
      .createQueryBuilder("b")
      .select("COALESCE(SUM(b.collection_amount), 0)", "amount_sum")
      .where("b.is_archived = false")
      .getRawOne<{ amount_sum: string }>();

    const donationBoxDonationsAmount = Number(donationBoxAgg?.amount_sum ?? 0);

    // 5) events + campaigns counts (non-archived)
    const [eventsCount, campaignsCount] = await Promise.all([
      this.eventRepo.count({ where: { is_archived: false } }),
      this.campaignRepo.count({ where: { is_archived: false } }),
    ]);

    const cards = {
      total_donations_amount: totalDonationsAmount,
      total_donations_count: totalDonationsCount,
      individual_donors_count: Number(
        donorCounts?.individual_donors_count ?? 0,
      ),
      corporate_donors_count: Number(donorCounts?.corporate_donors_count ?? 0),
      recurring_donors_count: recurringDonorsCount,
      recurring_donations_amount: recurringDonationsAmount,
      recurring_donations_count: recurringDonationsCount,
      total_recurring_collection: totalRecurringCollection,
      total_pending_installments_amount: totalPendingInstallmentsAmount,
      multi_time_donors_count: Number(
        donorCounts?.multi_time_donors_count ?? 0,
      ),
      active_donation_boxes_count: Number(activeDonationBoxesCount ?? 0),
      donation_box_donations_amount: donationBoxDonationsAmount,
      events_count: Number(eventsCount ?? 0),
      campaigns_count: Number(campaignsCount ?? 0),
    };

    return {
      cards,
      cumulative,
      recurring_donations_series,
      recurring_donors_series,
    };
  }
}
