import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, SelectQueryBuilder } from "typeorm";
import { ProgramEntity } from "../program/programs/entities/program.entity";
import { ApplicationReport } from "../program/application_reports/entities/application-report.entity";
import { RationReport } from "../program/ration/reports/entities/ration-report.entity";
import { EducationReport } from "../program/education/reports/entities/education-report.entity";
import { FinancialAssistanceReport } from "../program/financial_assistance/reports/entities/financial-assistance-report.entity";
import { MarriageGiftReport } from "../program/marriage_gifts/reports/entities/marriage-gift-report.entity";
import { KasbReport } from "../program/kasb/reports/entities/kasb-report.entity";
import { KasbTrainingReport } from "../program/kasb_training/reports/entities/kasb-training-report.entity";
import { SewingMachineReport } from "../program/sewing_machine/reports/entities/sewing-machine-report.entity";
import { TreePlantationReport } from "../program/tree_plantation/reports/entities/tree-plantation-report.entity";
import { WaterReport } from "../program/water/reports/entities/water-report.entity";
import { WheelChairOrCrutchesReport } from "../program/wheel_chair_or_crutches/reports/entities/wheel-chair-or-crutches-report.entity";
import { ProgramApplicationOverviewQueryDto } from "./dto/program-application-overview-query.dto";
import { DeliverablesOverviewQueryDto } from "./dto/deliverables-overview-query.dto";
import { StoreDailyReportEntity } from "../store/store_daily_reports/entities/store-daily-report.entity";
import { StoreDailyLatestQueryDto } from "./dto/store-daily-latest-query.dto";
import { ProcurementsDailyReportEntity } from "../procurements/procurements_daily_reports/entities/procurements-daily-report.entity";
import { AccountsAndFinanceDailyReportEntity } from "../accounts-and-finance/accounts_and_finance_daily_reports/entities/accounts-and-finance-daily-report.entity";
import { MonthlySumQueryDto } from "./dto/monthly-sum-query.dto";
import { AlHasanainClg } from "../program/al_hasanain_clg/entities/al_hasanain_clg.entity";
import { AasCollectionCentersReport } from "../program/aas_collection_centers_report/entities/aas_collection_centers_report.entity";
import { DreamSchoolReport } from "../program/dream_school_reports/entities/dream_school_report.entity";
import { HealthReport } from "../program/health/entities/health.entity";

/** Per active program: total “delivered” units in range (program-specific definition). */
export interface DeliverablesProgramRow {
  key: string;
  label: string;
  totalDelivered: number;
}

/** Cross-program rollup for one vulnerability dimension. */
export interface DeliverablesVulnerabilityRow {
  key: string;
  label: string;
  total: number;
}

/** One line on a per-program vulnerability mini-card (only categories that exist for that program’s reports). */
export interface DeliverablesProgramVulnerabilityLine {
  key: string;
  label: string;
  count: number;
}

/** Per-program carousel card: vulnerability breakdown for that program’s underlying report table(s). */
export interface DeliverablesProgramVulnerabilityCard {
  key: string;
  label: string;
  /** Same as `programsList[].totalDelivered` for this program. */
  totalDelivered: number;
  lines: DeliverablesProgramVulnerabilityLine[];
  /** Sum of `lines[].count` (only non-zero categories are listed). */
  vulnerabilitiesTotal: number;
}

export interface DeliverablesOverallPayload {
  from?: string;
  to?: string;
  programsList: DeliverablesProgramRow[];
  vulnerabilities: DeliverablesVulnerabilityRow[];
  /** Sum of delivered units across all programs in `programsList` (same as summing `totalDelivered`). */
  totalDeliveredAllPrograms: number;
  /** Sum of all vulnerability rollup totals in `vulnerabilities`. */
  totalVulnerabilitiesAll: number;
  /** One entry per active applicationable program; scrollable mini-cards on the client. */
  programVulnerabilityCards: DeliverablesProgramVulnerabilityCard[];
}

/** Card shape aligned with `department_daily_report` program_application_card / dummyData.js */
export interface ProgramApplicationOverviewCard {
  id: string;
  name: string;
  icon: string;
  accent: string;
  accentSoft: string;
  total: number;
  approvalRate: number;
  /** Sum of `investigation_count` per program / overall */
  investigated: number;
  verified: number;
  approved: number;
  rejected: number;
  pendingTotal?: number;
  isOverall?: boolean;
}

/** Latest store daily report snapshot (for dashboard cards). */
export interface StoreDailyLatestPayload {
  id: number;
  date: string;
  generated_demands: number;
  pending_demands: number;
  rejected_demands: number;
  generated_grn: number;
  pending_grn: number;
}

export interface StoreDailySumPayload {
  from?: string;
  to?: string;
  generated_demands: number;
  pending_demands: number;
  rejected_demands: number;
  generated_grn: number;
  pending_grn: number;
}

export interface ProcurementsDailySumPayload {
  from?: string;
  to?: string;
  total_generated_pos: number;
  pending_pos: number;
  fulfilled_pos: number;
  total_generated_pis: number;
  unpaid_pis: number;
  total_paid_amount: number;
  unpaid_amount: number;
  tenders: number;
}

export interface AccountsAndFinanceDailySumPayload {
  from?: string;
  to?: string;
  daily_inflow: number;
  daily_outflow: number;
  pending_payable: number;
  petty_cash: number;
  available_funds: number;
}

export interface AlHasanainClgSumPayload {
  from?: string;
  to?: string;
  records: number;
  total_students_sum: number;
  active_teachers_sum: number;
  fee_collection_sum: number;
  attendance_percent_avg: number;
  dropout_rate_avg: number;
  pass_rate_avg: number;
}

export interface AasCollectionCentersReportSumPayload {
  from?: string;
  to?: string;
  total_patients_sum: number;
  tests_conducted_sum: number;
  pending_tests_sum: number;
  revenue_sum: number;
  total_camps_sum: number;
  on_time_delivery_percent_avg: number;
  records: number;
}

export interface DreamSchoolReportsSumPayload {
  from?: string;
  to?: string;
  records: number;
  visits_sum: number;
  excellent_count: number;
  good_count: number;
  medium_count: number;
  poor_count: number;
}

export interface HealthReportsSumPayload {
  from?: string;
  to?: string;
  records: number;
  widows_sum: number;
  divorced_sum: number;
  disable_sum: number;
  indegent_sum: number;
  orphans_sum: number;
  total_sum: number;
}

const PROGRAM_CARD_STYLE_BY_KEY: Record<
  string,
  { icon: string; accent: string; accentSoft: string }
> = {
  food_security: { icon: "bag", accent: "#16a34a", accentSoft: "#dcfce7" },
  community_services: {
    icon: "users",
    accent: "#7c3aed",
    accentSoft: "#ede9fe",
  },
  financial_assistance_reports: {
    icon: "heart",
    accent: "#ea580c",
    accentSoft: "#ffedd5",
  },
  education: { icon: "book", accent: "#2563eb", accentSoft: "#dbeafe" },
  water_clean_water: {
    icon: "droplet",
    accent: "#0891b2",
    accentSoft: "#cffafe",
  },
  kasb: { icon: "tool", accent: "#4f46e5", accentSoft: "#e0e7ff" },
  livelihood_support_program: {
    icon: "tool",
    accent: "#0d9488",
    accentSoft: "#ccfbf1",
  },
  green_initiative: { icon: "bag", accent: "#15803d", accentSoft: "#dcfce7" },
  wheel_chair_or_crutches_reports: {
    icon: "heart",
    accent: "#be123c",
    accentSoft: "#ffe4e6",
  },
  health_reports: { icon: "heart", accent: "#0f766e", accentSoft: "#ccfbf1" },
};

function defaultStyleForProgramKey(key: string): {
  icon: string;
  accent: string;
  accentSoft: string;
} {
  let h = 0;
  const s = String(key || "");
  for (let i = 0; i < s.length; i += 1) {
    h = (h * 31 + s.charCodeAt(i)) | 0;
  }
  const hue = Math.abs(h) % 360;
  return {
    icon: "tool",
    accent: `hsl(${hue} 45% 40%)`,
    accentSoft: `hsl(${hue} 40% 92%)`,
  };
}

function roundRate(approved: number, total: number): number {
  if (!total || total <= 0) {
    return 0;
  }
  return Math.round((approved / total) * 1000) / 10;
}

function applyReportDateFilter(
  qb: SelectQueryBuilder<ApplicationReport>,
  alias: string,
  from?: string,
  to?: string,
): void {
  if (from && to) {
    qb.andWhere(`${alias}.report_date BETWEEN :from AND :to`, { from, to });
  } else if (from) {
    qb.andWhere(`${alias}.report_date >= :from`, { from });
  } else if (to) {
    qb.andWhere(`${alias}.report_date <= :to`, { to });
  }
}

function applyDeliverablesDateFilter(
  qb: SelectQueryBuilder<any>,
  alias: string,
  dateColumn: "report_date" | "date",
  from?: string,
  to?: string,
): void {
  const col = `${alias}.${dateColumn}`;
  if (from && to) {
    qb.andWhere(`${col} BETWEEN :from AND :to`, { from, to });
  } else if (from) {
    qb.andWhere(`${col} >= :from`, { from });
  } else if (to) {
    qb.andWhere(`${col} <= :to`, { to });
  }
}

function applyStoreDailyDateFilter(
  qb: SelectQueryBuilder<StoreDailyReportEntity>,
  alias: string,
  from?: string,
  to?: string,
): void {
  const col = `${alias}.date`;
  if (from && to) {
    qb.andWhere(`${col} BETWEEN :from AND :to`, { from, to });
  } else if (from) {
    qb.andWhere(`${col} >= :from`, { from });
  } else if (to) {
    qb.andWhere(`${col} <= :to`, { to });
  }
}

function applyDateColumnFilter(
  qb: SelectQueryBuilder<any>,
  alias: string,
  column: string,
  from?: string,
  to?: string,
): void {
  const col = `${alias}.${column}`;
  if (from && to) {
    qb.andWhere(`${col} BETWEEN :from AND :to`, { from, to });
  } else if (from) {
    qb.andWhere(`${col} >= :from`, { from });
  } else if (to) {
    qb.andWhere(`${col} <= :to`, { to });
  }
}

@Injectable()
export class NewDashboardService {
  constructor(
    @InjectRepository(ProgramEntity)
    private readonly programRepository: Repository<ProgramEntity>,
    @InjectRepository(ApplicationReport)
    private readonly applicationReportRepository: Repository<ApplicationReport>,
    @InjectRepository(RationReport)
    private readonly rationReportRepository: Repository<RationReport>,
    @InjectRepository(EducationReport)
    private readonly educationReportRepository: Repository<EducationReport>,
    @InjectRepository(FinancialAssistanceReport)
    private readonly financialAssistanceReportRepository: Repository<FinancialAssistanceReport>,
    @InjectRepository(MarriageGiftReport)
    private readonly marriageGiftReportRepository: Repository<MarriageGiftReport>,
    @InjectRepository(KasbReport)
    private readonly kasbReportRepository: Repository<KasbReport>,
    @InjectRepository(KasbTrainingReport)
    private readonly kasbTrainingReportRepository: Repository<KasbTrainingReport>,
    @InjectRepository(SewingMachineReport)
    private readonly sewingMachineReportRepository: Repository<SewingMachineReport>,
    @InjectRepository(TreePlantationReport)
    private readonly treePlantationReportRepository: Repository<TreePlantationReport>,
    @InjectRepository(WaterReport)
    private readonly waterReportRepository: Repository<WaterReport>,
    @InjectRepository(WheelChairOrCrutchesReport)
    private readonly wheelChairOrCrutchesReportRepository: Repository<WheelChairOrCrutchesReport>,
    @InjectRepository(StoreDailyReportEntity)
    private readonly storeDailyReportRepository: Repository<StoreDailyReportEntity>,
    @InjectRepository(ProcurementsDailyReportEntity)
    private readonly procurementsDailyReportRepository: Repository<ProcurementsDailyReportEntity>,
    @InjectRepository(AccountsAndFinanceDailyReportEntity)
    private readonly accountsAndFinanceDailyReportRepository: Repository<AccountsAndFinanceDailyReportEntity>,
    @InjectRepository(AlHasanainClg)
    private readonly alHasanainClgRepository: Repository<AlHasanainClg>,
    @InjectRepository(AasCollectionCentersReport)
    private readonly aasCollectionCentersReportRepository: Repository<AasCollectionCentersReport>,
    @InjectRepository(DreamSchoolReport)
    private readonly dreamSchoolReportRepository: Repository<DreamSchoolReport>,
    @InjectRepository(HealthReport)
    private readonly healthReportRepository: Repository<HealthReport>,
  ) {}

  /**
   * Active programs (ordered by id) + aggregated application report metrics per program key.
   * First card is **Overall** (all projects); following cards match active programs (zeros if no rows).
   */
  async getProgramApplicationOverview(
    query: ProgramApplicationOverviewQueryDto,
  ): Promise<{ data: ProgramApplicationOverviewCard[] }> {
    const { from, to } = query;

    const overallRow = await this.buildOverallTotals(from, to);
    const byProject = await this.aggregateByProject(from, to);

    const activePrograms = await this.programRepository.find({
      where: { is_archived: false, status: "active", applicationable: true },
      order: { id: "ASC" },
    });

    const overallCard: ProgramApplicationOverviewCard = {
      id: "overall",
      name: "Overall",
      icon: "layers",
      accent: "#1e293b",
      accentSoft: "#e2e8f0",
      total: overallRow.application_count,
      approvalRate: roundRate(
        overallRow.approved,
        overallRow.application_count,
      ),
      investigated: overallRow.investigated,
      verified: overallRow.verified,
      approved: overallRow.approved,
      rejected: overallRow.rejected,
      pendingTotal: overallRow.pending,
      isOverall: true,
    };

    const programCards: ProgramApplicationOverviewCard[] = activePrograms.map(
      (p) => {
        const agg = byProject.get(p.key) ?? {
          application_count: 0,
          investigated: 0,
          verified: 0,
          approved: 0,
          rejected: 0,
          pending: 0,
        };
        const style =
          PROGRAM_CARD_STYLE_BY_KEY[p.key] ?? defaultStyleForProgramKey(p.key);
        return {
          id: p.key,
          name: p.label,
          ...style,
          total: agg.application_count,
          approvalRate: roundRate(agg.approved, agg.application_count),
          investigated: agg.investigated,
          verified: agg.verified,
          approved: agg.approved,
          rejected: agg.rejected,
        };
      },
    );

    return { data: [overallCard, ...programCards] };
  }

  /**
   * Latest Store daily report snapshot (for a single dashboard card).
   * Optional query `from`, `to` filters by `store_daily_reports.date` (inclusive).
   */
  async getStoreDailyLatest(
    query: StoreDailyLatestQueryDto,
  ): Promise<{ data: StoreDailyLatestPayload | null }> {
    const { from, to } = query || {};
    const qb = this.storeDailyReportRepository
      .createQueryBuilder("r")
      .orderBy("r.date", "DESC")
      .addOrderBy("r.id", "DESC")
      .take(1);

    applyStoreDailyDateFilter(qb, "r", from, to);

    const row = await qb.getOne();
    if (!row) {
      return { data: null };
    }

    const ymd =
      row.date instanceof Date
        ? row.date.toISOString().slice(0, 10)
        : String(row.date ?? "").slice(0, 10);

    return {
      data: {
        id: row.id,
        date: ymd,
        generated_demands: Number(row.generated_demands) || 0,
        pending_demands: Number(row.pending_demands) || 0,
        rejected_demands: Number(row.rejected_demands) || 0,
        generated_grn: Number(row.generated_grn) || 0,
        pending_grn: Number(row.pending_grn) || 0,
      },
    };
  }

  /** Sum store daily reports within optional date range. */
  async getStoreDailyMonthlySum(
    query: MonthlySumQueryDto,
  ): Promise<{ data: StoreDailySumPayload }> {
    const { from, to } = query || {};
    const qb = this.storeDailyReportRepository
      .createQueryBuilder("r")
      .select("COALESCE(SUM(r.generated_demands), 0)", "generated_demands")
      .addSelect("COALESCE(SUM(r.pending_demands), 0)", "pending_demands")
      .addSelect("COALESCE(SUM(r.rejected_demands), 0)", "rejected_demands")
      .addSelect("COALESCE(SUM(r.generated_grn), 0)", "generated_grn")
      .addSelect("COALESCE(SUM(r.pending_grn), 0)", "pending_grn")
      .where("r.is_archived = false");

    applyDateColumnFilter(qb, "r", "date", from, to);

    const raw = await qb.getRawOne<Record<string, string>>();
    return {
      data: {
        from,
        to,
        generated_demands: Number(raw?.generated_demands ?? 0),
        pending_demands: Number(raw?.pending_demands ?? 0),
        rejected_demands: Number(raw?.rejected_demands ?? 0),
        generated_grn: Number(raw?.generated_grn ?? 0),
        pending_grn: Number(raw?.pending_grn ?? 0),
      },
    };
  }

  /** Sum procurements daily reports within optional date range. */
  async getProcurementsMonthlySum(
    query: MonthlySumQueryDto,
  ): Promise<{ data: ProcurementsDailySumPayload }> {
    const { from, to } = query || {};
    const qb = this.procurementsDailyReportRepository
      .createQueryBuilder("r")
      .select("COALESCE(SUM(r.total_generated_pos), 0)", "total_generated_pos")
      .addSelect("COALESCE(SUM(r.pending_pos), 0)", "pending_pos")
      .addSelect("COALESCE(SUM(r.fulfilled_pos), 0)", "fulfilled_pos")
      .addSelect(
        "COALESCE(SUM(r.total_generated_pis), 0)",
        "total_generated_pis",
      )
      .addSelect("COALESCE(SUM(r.unpaid_pis), 0)", "unpaid_pis")
      .addSelect("COALESCE(SUM(r.total_paid_amount), 0)", "total_paid_amount")
      .addSelect("COALESCE(SUM(r.unpaid_amount), 0)", "unpaid_amount")
      .addSelect("COALESCE(SUM(r.tenders), 0)", "tenders")
      .where("r.is_archived = false");

    applyDateColumnFilter(qb, "r", "date", from, to);

    const raw = await qb.getRawOne<Record<string, string>>();
    return {
      data: {
        from,
        to,
        total_generated_pos: Number(raw?.total_generated_pos ?? 0),
        pending_pos: Number(raw?.pending_pos ?? 0),
        fulfilled_pos: Number(raw?.fulfilled_pos ?? 0),
        total_generated_pis: Number(raw?.total_generated_pis ?? 0),
        unpaid_pis: Number(raw?.unpaid_pis ?? 0),
        total_paid_amount: Number(raw?.total_paid_amount ?? 0),
        unpaid_amount: Number(raw?.unpaid_amount ?? 0),
        tenders: Number(raw?.tenders ?? 0),
      },
    };
  }

  /** Sum accounts & finance daily reports within optional date range. */
  async getAccountsAndFinanceMonthlySum(
    query: MonthlySumQueryDto,
  ): Promise<{ data: AccountsAndFinanceDailySumPayload }> {
    const { from, to } = query || {};
    const qb = this.accountsAndFinanceDailyReportRepository
      .createQueryBuilder("r")
      .select("COALESCE(SUM(r.daily_inflow), 0)", "daily_inflow")
      .addSelect("COALESCE(SUM(r.daily_outflow), 0)", "daily_outflow")
      .addSelect("COALESCE(SUM(r.pending_payable), 0)", "pending_payable")
      .addSelect("COALESCE(SUM(r.petty_cash), 0)", "petty_cash")
      .addSelect("COALESCE(SUM(r.available_funds), 0)", "available_funds")
      .where("r.is_archived = false");

    applyDateColumnFilter(qb, "r", "date", from, to);

    const raw = await qb.getRawOne<Record<string, string>>();
    return {
      data: {
        from,
        to,
        daily_inflow: Number(raw?.daily_inflow ?? 0),
        daily_outflow: Number(raw?.daily_outflow ?? 0),
        pending_payable: Number(raw?.pending_payable ?? 0),
        petty_cash: Number(raw?.petty_cash ?? 0),
        available_funds: Number(raw?.available_funds ?? 0),
      },
    };
  }

  /** Sum/avg Al Hasanain CLG records within optional date range (filters on `created_at`). */
  async getAlHasanainClgMonthlySum(
    query: MonthlySumQueryDto,
  ): Promise<{ data: AlHasanainClgSumPayload }> {
    const { from, to } = query || {};

    const qb = this.alHasanainClgRepository
      .createQueryBuilder("r")
      .select("COALESCE(COUNT(r.id), 0)", "records")
      .addSelect("COALESCE(SUM(r.total_students), 0)", "total_students_sum")
      .addSelect("COALESCE(SUM(r.active_teachers), 0)", "active_teachers_sum")
      .addSelect("COALESCE(SUM(r.fee_collection), 0)", "fee_collection_sum")
      .addSelect(
        "COALESCE(AVG(r.attendance_percent), 0)",
        "attendance_percent_avg",
      )
      .addSelect("COALESCE(AVG(r.dropout_rate), 0)", "dropout_rate_avg")
      .addSelect("COALESCE(AVG(r.pass_rate), 0)", "pass_rate_avg")
      .where("r.is_archived = false");

    // Filter by created_at date (YYYY-MM-DD). Uses DATE() to ignore time.
    if (from && to) {
      qb.andWhere("DATE(r.created_at) BETWEEN :from AND :to", { from, to });
    } else if (from) {
      qb.andWhere("DATE(r.created_at) >= :from", { from });
    } else if (to) {
      qb.andWhere("DATE(r.created_at) <= :to", { to });
    }

    const raw = await qb.getRawOne<Record<string, string>>();

    const round1 = (v: any) => Math.round((Number(v) || 0) * 10) / 10;

    return {
      data: {
        from,
        to,
        records: Number(raw?.records ?? 0),
        total_students_sum: Number(raw?.total_students_sum ?? 0),
        active_teachers_sum: Number(raw?.active_teachers_sum ?? 0),
        fee_collection_sum: Number(raw?.fee_collection_sum ?? 0),
        attendance_percent_avg: round1(raw?.attendance_percent_avg),
        dropout_rate_avg: round1(raw?.dropout_rate_avg),
        pass_rate_avg: round1(raw?.pass_rate_avg),
      },
    };
  }

  /** Sum/avg AAS collection centers reports within optional date range (filters on `created_at`). */
  async getAasCollectionCentersReportMonthlySum(
    query: MonthlySumQueryDto,
  ): Promise<{ data: AasCollectionCentersReportSumPayload }> {
    const { from, to } = query || {};

    const qb = this.aasCollectionCentersReportRepository
      .createQueryBuilder("r")
      .select("COALESCE(COUNT(r.id), 0)", "records")
      .addSelect("COALESCE(SUM(r.total_patients), 0)", "total_patients_sum")
      .addSelect("COALESCE(SUM(r.tests_conducted), 0)", "tests_conducted_sum")
      .addSelect("COALESCE(SUM(r.pending_tests), 0)", "pending_tests_sum")
      .addSelect("COALESCE(SUM(r.revenue), 0)", "revenue_sum")
      .addSelect("COALESCE(SUM(r.total_camps), 0)", "total_camps_sum")
      .addSelect(
        "COALESCE(AVG(r.on_time_delivery_percent), 0)",
        "on_time_delivery_percent_avg",
      )
      .where("r.is_archived = false");

    if (from && to) {
      qb.andWhere("DATE(r.created_at) BETWEEN :from AND :to", { from, to });
    } else if (from) {
      qb.andWhere("DATE(r.created_at) >= :from", { from });
    } else if (to) {
      qb.andWhere("DATE(r.created_at) <= :to", { to });
    }

    const raw = await qb.getRawOne<Record<string, string>>();
    const round1 = (v: any) => Math.round((Number(v) || 0) * 10) / 10;

    return {
      data: {
        from,
        to,
        records: Number(raw?.records ?? 0),
        total_patients_sum: Number(raw?.total_patients_sum ?? 0),
        tests_conducted_sum: Number(raw?.tests_conducted_sum ?? 0),
        pending_tests_sum: Number(raw?.pending_tests_sum ?? 0),
        revenue_sum: Number(raw?.revenue_sum ?? 0),
        total_camps_sum: Number(raw?.total_camps_sum ?? 0),
        on_time_delivery_percent_avg: round1(raw?.on_time_delivery_percent_avg),
      },
    };
  }

  /** Sum dream school reports within optional date range (filters on `created_at`). */
  async getDreamSchoolReportsMonthlySum(
    query: MonthlySumQueryDto,
  ): Promise<{ data: DreamSchoolReportsSumPayload }> {
    const { from, to } = query || {};

    const qb = this.dreamSchoolReportRepository
      .createQueryBuilder("r")
      .select("COALESCE(COUNT(r.id), 0)", "records")
      .addSelect("COALESCE(SUM(r.visits), 0)", "visits_sum")
      .addSelect(
        `COALESCE(SUM(CASE WHEN r.teacher_performance = 'excellent' THEN 1 ELSE 0 END), 0)`,
        "excellent_count",
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN r.teacher_performance = 'good' THEN 1 ELSE 0 END), 0)`,
        "good_count",
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN r.teacher_performance = 'medium' THEN 1 ELSE 0 END), 0)`,
        "medium_count",
      )
      .addSelect(
        `COALESCE(SUM(CASE WHEN r.teacher_performance = 'poor' THEN 1 ELSE 0 END), 0)`,
        "poor_count",
      )
      .where("r.is_archived = false");

    if (from && to) {
      qb.andWhere("DATE(r.created_at) BETWEEN :from AND :to", { from, to });
    } else if (from) {
      qb.andWhere("DATE(r.created_at) >= :from", { from });
    } else if (to) {
      qb.andWhere("DATE(r.created_at) <= :to", { to });
    }

    const raw = await qb.getRawOne<Record<string, string>>();
    return {
      data: {
        from,
        to,
        records: Number(raw?.records ?? 0),
        visits_sum: Number(raw?.visits_sum ?? 0),
        excellent_count: Number(raw?.excellent_count ?? 0),
        good_count: Number(raw?.good_count ?? 0),
        medium_count: Number(raw?.medium_count ?? 0),
        poor_count: Number(raw?.poor_count ?? 0),
      },
    };
  }

  /** Sum health reports within optional date range (filters on `date`). */
  async getHealthReportsMonthlySum(
    query: MonthlySumQueryDto,
  ): Promise<{ data: HealthReportsSumPayload }> {
    const { from, to } = query || {};

    const qb = this.healthReportRepository
      .createQueryBuilder("r")
      .select("COALESCE(COUNT(r.id), 0)", "records")
      .addSelect("COALESCE(SUM(r.widows), 0)", "widows_sum")
      .addSelect("COALESCE(SUM(r.divorced), 0)", "divorced_sum")
      .addSelect("COALESCE(SUM(r.disable), 0)", "disable_sum")
      .addSelect("COALESCE(SUM(r.indegent), 0)", "indegent_sum")
      .addSelect("COALESCE(SUM(r.orphans), 0)", "orphans_sum")
      .addSelect(
        "COALESCE(SUM(r.widows + r.divorced + r.disable + r.indegent + r.orphans), 0)",
        "total_sum",
      )
      .where("r.is_archived = false");

    applyDateColumnFilter(qb, "r", "date", from, to);

    const raw = await qb.getRawOne<Record<string, string>>();
    return {
      data: {
        from,
        to,
        records: Number(raw?.records ?? 0),
        widows_sum: Number(raw?.widows_sum ?? 0),
        divorced_sum: Number(raw?.divorced_sum ?? 0),
        disable_sum: Number(raw?.disable_sum ?? 0),
        indegent_sum: Number(raw?.indegent_sum ?? 0),
        orphans_sum: Number(raw?.orphans_sum ?? 0),
        total_sum: Number(raw?.total_sum ?? 0),
      },
    };
  }

  private async buildOverallTotals(
    from?: string,
    to?: string,
  ): Promise<{
    application_count: number;
    investigated: number;
    verified: number;
    approved: number;
    rejected: number;
    pending: number;
  }> {
    const qb = this.applicationReportRepository
      .createQueryBuilder("r")
      .select("COALESCE(SUM(r.application_count), 0)", "application_count")
      .addSelect("COALESCE(SUM(r.investigation_count), 0)", "investigated")
      .addSelect("COALESCE(SUM(r.verified_count), 0)", "verified")
      .addSelect("COALESCE(SUM(r.approved_count), 0)", "approved")
      .addSelect("COALESCE(SUM(r.rejected_count), 0)", "rejected")
      .addSelect("COALESCE(SUM(r.pending_count), 0)", "pending")
      .where("r.is_archived = false");

    applyReportDateFilter(qb, "r", from, to);

    const raw = await qb.getRawOne<{
      application_count: string;
      investigated: string;
      verified: string;
      approved: string;
      rejected: string;
      pending: string;
    }>();

    return {
      application_count: Number(raw?.application_count ?? 0),
      investigated: Number(raw?.investigated ?? 0),
      verified: Number(raw?.verified ?? 0),
      approved: Number(raw?.approved ?? 0),
      rejected: Number(raw?.rejected ?? 0),
      pending: Number(raw?.pending ?? 0),
    };
  }

  private async aggregateByProject(
    from?: string,
    to?: string,
  ): Promise<
    Map<
      string,
      {
        application_count: number;
        investigated: number;
        verified: number;
        approved: number;
        rejected: number;
        pending: number;
      }
    >
  > {
    const qb = this.applicationReportRepository
      .createQueryBuilder("r")
      .select("r.project", "project")
      .addSelect("COALESCE(SUM(r.application_count), 0)", "application_count")
      .addSelect("COALESCE(SUM(r.investigation_count), 0)", "investigated")
      .addSelect("COALESCE(SUM(r.verified_count), 0)", "verified")
      .addSelect("COALESCE(SUM(r.approved_count), 0)", "approved")
      .addSelect("COALESCE(SUM(r.rejected_count), 0)", "rejected")
      .addSelect("COALESCE(SUM(r.pending_count), 0)", "pending")
      .where("r.is_archived = false")
      .groupBy("r.project");

    applyReportDateFilter(qb, "r", from, to);

    const rows = await qb.getRawMany<{
      project: string;
      application_count: string;
      investigated: string;
      verified: string;
      approved: string;
      rejected: string;
      pending: string;
    }>();

    const map = new Map<
      string,
      {
        application_count: number;
        investigated: number;
        verified: number;
        approved: number;
        rejected: number;
        pending: number;
      }
    >();
    for (const row of rows) {
      if (!row.project) {
        continue;
      }
      map.set(row.project, {
        application_count: Number(row.application_count),
        investigated: Number(row.investigated),
        verified: Number(row.verified),
        approved: Number(row.approved),
        rejected: Number(row.rejected),
        pending: Number(row.pending),
      });
    }
    return map;
  }

  /**
   * First “overall” card for Deliverables-by-program UX: program totals + global vulnerability rollups.
   * Date filters apply to each underlying report table (`report_date` or `date`).
   */
  async getDeliverablesOverallCard(
    query: DeliverablesOverviewQueryDto,
  ): Promise<DeliverablesOverallPayload> {
    const { from, to } = query;

    const programs = await this.programRepository.find({
      where: { is_archived: false, status: "active", applicationable: true },
      order: { id: "ASC" },
    });

    const programsList: DeliverablesProgramRow[] = [];
    const programVulnerabilityCards: DeliverablesProgramVulnerabilityCard[] =
      [];

    for (const p of programs) {
      const totalDelivered = await this.sumDeliveredForProgramKey(
        p.key,
        from,
        to,
      );
      programsList.push({ key: p.key, label: p.label, totalDelivered });
      const breakdown = await this.vulnerabilityBreakdownForProgramKey(
        p.key,
        from,
        to,
      );
      const lines = this.vulnerabilityBreakdownToLines(breakdown);
      const vulnerabilitiesTotal = lines.reduce((s, l) => s + l.count, 0);
      programVulnerabilityCards.push({
        key: p.key,
        label: p.label,
        totalDelivered,
        lines,
        vulnerabilitiesTotal,
      });
    }

    const vulnerabilities = await this.buildDeliverablesVulnerabilityTotals(
      from,
      to,
    );
    const totalDeliveredAllPrograms = programsList.reduce(
      (s, r) => s + r.totalDelivered,
      0,
    );
    const totalVulnerabilitiesAll = vulnerabilities.reduce(
      (s, r) => s + r.total,
      0,
    );

    return {
      from,
      to,
      programsList,
      vulnerabilities,
      totalDeliveredAllPrograms,
      totalVulnerabilitiesAll,
      programVulnerabilityCards,
    };
  }

  /**
   * Raw vulnerability counts for one program’s report model (zeros where the schema has no column).
   */
  private async vulnerabilityBreakdownForProgramKey(
    programKey: string,
    from?: string,
    to?: string,
  ): Promise<{
    widows: number;
    orphans: number;
    divorced: number;
    disable: number;
    indegent: number;
    extremePoor: number;
  }> {
    switch (programKey) {
      // case 'food_security':
      case "ration_reports": {
        const [widows, orphans, divorced, disable, indegent] =
          await Promise.all([
            this.sumRationWidows(from, to),
            this.sumRationOrphans(from, to),
            this.sumRationDivorced(from, to),
            this.sumRationDisable(from, to),
            this.sumRationIndegent(from, to),
          ]);
        return { widows, orphans, divorced, disable, indegent, extremePoor: 0 };
      }
      case "marriage_gift_reports": {
        const [orphans, divorced, disable, indegent] = await Promise.all([
          this.sumMarriageOrphans(from, to),
          this.sumMarriageDivorced(from, to),
          this.sumMarriageDisable(from, to),
          this.sumMarriageIndegent(from, to),
        ]);
        return {
          widows: 0,
          orphans,
          divorced,
          disable,
          indegent,
          extremePoor: 0,
        };
      }
      case "education": {
        const [orphans, divorced, disable, indegent] = await Promise.all([
          this.sumEducationOrphans(from, to),
          this.sumEducationDivorced(from, to),
          this.sumEducationDisable(from, to),
          this.sumEducationIndegent(from, to),
        ]);
        return {
          widows: 0,
          orphans,
          divorced,
          disable,
          indegent,
          extremePoor: 0,
        };
      }
      case "financial_assistance_reports": {
        const [widows, divorced, disable, extremePoor] = await Promise.all([
          this.sumFinancialWidow(from, to),
          this.sumFinancialDivorced(from, to),
          this.sumFinancialDisable(from, to),
          this.sumFinancialExtremePoor(from, to),
        ]);
        return {
          widows,
          orphans: 0,
          divorced,
          disable,
          indegent: 0,
          extremePoor,
        };
      }
      case "sewing_machine_reports": {
        const [orphans, divorced, disable, indegent] = await Promise.all([
          this.sumSewingOrphans(from, to),
          this.sumSewingDivorced(from, to),
          this.sumSewingDisable(from, to),
          this.sumSewingIndegent(from, to),
        ]);
        return {
          widows: 0,
          orphans,
          divorced,
          disable,
          indegent,
          extremePoor: 0,
        };
      }
      case "wheel_chair_or_crutches_reports": {
        const [orphans, divorced, disable, indegent] = await Promise.all([
          this.sumWheelOrphans(from, to),
          this.sumWheelDivorced(from, to),
          this.sumWheelDisable(from, to),
          this.sumWheelIndegent(from, to),
        ]);
        return {
          widows: 0,
          orphans,
          divorced,
          disable,
          indegent,
          extremePoor: 0,
        };
      }
      case "health_reports": {
        const [widows, orphans, divorced, disable, indegent] =
          await Promise.all([
            this.sumHealthWidows(from, to),
            this.sumHealthOrphans(from, to),
            this.sumHealthDivorced(from, to),
            this.sumHealthDisable(from, to),
            this.sumHealthIndegent(from, to),
          ]);
        return { widows, orphans, divorced, disable, indegent, extremePoor: 0 };
      }
      default:
        return {
          widows: 0,
          orphans: 0,
          divorced: 0,
          disable: 0,
          indegent: 0,
          extremePoor: 0,
        };
    }
  }

  private vulnerabilityBreakdownToLines(b: {
    widows: number;
    orphans: number;
    divorced: number;
    disable: number;
    indegent: number;
    extremePoor: number;
  }): DeliverablesProgramVulnerabilityLine[] {
    const defs: { key: string; label: string; count: number }[] = [
      { key: "widows", label: "Widows", count: b.widows },
      { key: "orphans", label: "Orphans", count: b.orphans },
      { key: "divorced", label: "Divorced", count: b.divorced },
      { key: "disable", label: "Disable", count: b.disable },
      { key: "indegent", label: "Indegent", count: b.indegent },
      { key: "extreme_poor", label: "Extreme poor", count: b.extremePoor },
    ];
    return defs
      .filter((d) => d.count > 0)
      .map((d) => ({ key: d.key, label: d.label, count: d.count }));
  }

  private async sumDeliveredForProgramKey(
    programKey: string,
    from?: string,
    to?: string,
  ): Promise<number> {
    switch (programKey) {
      // case 'food_security':
      case "ration_reports":
        return this.sumRationTotalDelivered(from, to);
      case "marriage_gift_reports":
        return this.sumMarriageTotal(from, to);
      case "education":
        return this.sumEducationTotal(from, to);
      case "water_clean_water":
        return this.sumScalar(
          this.waterReportRepository,
          "w",
          "date",
          "COALESCE(SUM(w.quantity), 0)",
          from,
          to,
        );
      case "kasb":
        return this.sumScalar(
          this.kasbReportRepository,
          "k",
          "date",
          "COALESCE(SUM(k.delivery), 0)",
          from,
          to,
        );
      case "kasb_training_reports":
        return this.sumScalar(
          this.kasbTrainingReportRepository,
          "t",
          "date",
          "COALESCE(SUM(t.total), 0)",
          from,
          to,
        );
      case "green_initiative":
        return this.sumScalar(
          this.treePlantationReportRepository,
          "tr",
          "report_date",
          "COALESCE(SUM(tr.plants), 0)",
          from,
          to,
        );
      case "financial_assistance_reports":
        return this.sumFinancialTotal(from, to);
      case "sewing_machine_reports":
        return this.sumSewingTotal(from, to);
      case "wheel_chair_or_crutches_reports":
        return this.sumWheelTotal(from, to);
      case "health_reports":
        return this.sumHealthTotal(from, to);
      default:
        return 0;
    }
  }

  private async sumScalar(
    repo: Repository<any>,
    alias: string,
    dateColumn: "report_date" | "date",
    selectSql: string,
    from?: string,
    to?: string,
  ): Promise<number> {
    const qb = repo
      .createQueryBuilder(alias)
      .select(selectSql, "v")
      .where(`${alias}.is_archived = false`);
    applyDeliverablesDateFilter(qb, alias, dateColumn, from, to);
    const raw = await qb.getRawOne<{ v: string }>();
    return Number(raw?.v ?? 0);
  }

  private async sumRationTotalDelivered(
    from?: string,
    to?: string,
  ): Promise<number> {
    const qb = this.rationReportRepository
      .createQueryBuilder("r")
      .select(
        "COALESCE(SUM(r.full_widows + r.half_widows + r.full_divorced + r.half_divorced + r.full_disable + r.half_disable + r.full_indegent + r.half_indegent + r.full_orphan + r.half_orphan + r.life_time_full_widows + r.life_time_half_widows + r.life_time_full_divorced + r.life_time_half_divorced + r.life_time_full_disable + r.life_time_half_disable + r.life_time_full_indegent + r.life_time_half_indegent + r.life_time_full_orphan + r.life_time_half_orphan), 0)",
        "v",
      )
      .where("r.is_archived = false");
    applyDeliverablesDateFilter(qb, "r", "report_date", from, to);
    const raw = await qb.getRawOne<{ v: string }>();
    return Number(raw?.v ?? 0);
  }

  private async sumMarriageTotal(from?: string, to?: string): Promise<number> {
    const qb = this.marriageGiftReportRepository
      .createQueryBuilder("m")
      .select(
        "COALESCE(SUM(m.orphans + m.divorced + m.disable + m.indegent), 0)",
        "v",
      )
      .where("m.is_archived = false");
    applyDeliverablesDateFilter(qb, "m", "report_date", from, to);
    const raw = await qb.getRawOne<{ v: string }>();
    return Number(raw?.v ?? 0);
  }

  private async sumEducationTotal(from?: string, to?: string): Promise<number> {
    const qb = this.educationReportRepository
      .createQueryBuilder("e")
      .select(
        "COALESCE(SUM(e.male_orphans + e.male_divorced + e.male_disable + e.male_indegent + e.female_orphans + e.female_divorced + e.female_disable + e.female_indegent), 0)",
        "v",
      )
      .where("e.is_archived = false");
    applyDeliverablesDateFilter(qb, "e", "date", from, to);
    const raw = await qb.getRawOne<{ v: string }>();
    return Number(raw?.v ?? 0);
  }

  private async sumFinancialTotal(from?: string, to?: string): Promise<number> {
    const qb = this.financialAssistanceReportRepository
      .createQueryBuilder("f")
      .select(
        "COALESCE(SUM(f.widow + f.divorced + f.disable + f.extreme_poor), 0)",
        "v",
      )
      .where("f.is_archived = false");
    applyDeliverablesDateFilter(qb, "f", "report_date", from, to);
    const raw = await qb.getRawOne<{ v: string }>();
    return Number(raw?.v ?? 0);
  }

  private async sumSewingTotal(from?: string, to?: string): Promise<number> {
    const qb = this.sewingMachineReportRepository
      .createQueryBuilder("s")
      .select(
        "COALESCE(SUM(s.orphans + s.divorced + s.disable + s.indegent), 0)",
        "v",
      )
      .where("s.is_archived = false");
    applyDeliverablesDateFilter(qb, "s", "date", from, to);
    const raw = await qb.getRawOne<{ v: string }>();
    return Number(raw?.v ?? 0);
  }

  private async sumHealthTotal(from?: string, to?: string): Promise<number> {
    const qb = this.healthReportRepository
      .createQueryBuilder("h")
      .select(
        "COALESCE(SUM(h.widows + h.divorced + h.disable + h.indegent + h.orphans), 0)",
        "v",
      )
      .where("h.is_archived = false");
    applyDeliverablesDateFilter(qb, "h", "date", from, to);
    const raw = await qb.getRawOne<{ v: string }>();
    return Number(raw?.v ?? 0);
  }

  private async sumWheelTotal(from?: string, to?: string): Promise<number> {
    const qb = this.wheelChairOrCrutchesReportRepository
      .createQueryBuilder("w")
      .select(
        "COALESCE(SUM(w.orphans + w.divorced + w.disable + w.indegent), 0)",
        "v",
      )
      .where("w.is_archived = false");
    applyDeliverablesDateFilter(qb, "w", "date", from, to);
    const raw = await qb.getRawOne<{ v: string }>();
    return Number(raw?.v ?? 0);
  }

  private async buildDeliverablesVulnerabilityTotals(
    from?: string,
    to?: string,
  ): Promise<DeliverablesVulnerabilityRow[]> {
    const widows =
      (await this.sumRationWidows(from, to)) +
      (await this.sumFinancialWidow(from, to)) +
      (await this.sumHealthWidows(from, to));
    const orphans =
      (await this.sumRationOrphans(from, to)) +
      (await this.sumMarriageOrphans(from, to)) +
      (await this.sumSewingOrphans(from, to)) +
      (await this.sumEducationOrphans(from, to)) +
      (await this.sumWheelOrphans(from, to)) +
      (await this.sumHealthOrphans(from, to));
    const divorced =
      (await this.sumRationDivorced(from, to)) +
      (await this.sumMarriageDivorced(from, to)) +
      (await this.sumSewingDivorced(from, to)) +
      (await this.sumEducationDivorced(from, to)) +
      (await this.sumFinancialDivorced(from, to)) +
      (await this.sumWheelDivorced(from, to)) +
      (await this.sumHealthDivorced(from, to));
    const disable =
      (await this.sumRationDisable(from, to)) +
      (await this.sumMarriageDisable(from, to)) +
      (await this.sumSewingDisable(from, to)) +
      (await this.sumEducationDisable(from, to)) +
      (await this.sumFinancialDisable(from, to)) +
      (await this.sumWheelDisable(from, to)) +
      (await this.sumHealthDisable(from, to));
    const indegent =
      (await this.sumRationIndegent(from, to)) +
      (await this.sumMarriageIndegent(from, to)) +
      (await this.sumSewingIndegent(from, to)) +
      (await this.sumEducationIndegent(from, to)) +
      (await this.sumWheelIndegent(from, to)) +
      (await this.sumHealthIndegent(from, to));
    const extremePoor = await this.sumFinancialExtremePoor(from, to);

    return [
      { key: "widows", label: "Widows", total: widows },
      { key: "orphans", label: "Orphans", total: orphans },
      { key: "divorced", label: "Divorced", total: divorced },
      { key: "disable", label: "Disable", total: disable },
      { key: "indegent", label: "Indegent", total: indegent },
      { key: "extreme_poor", label: "Extreme poor", total: extremePoor },
    ];
  }

  private async sumRationWidows(from?: string, to?: string): Promise<number> {
    const qb = this.rationReportRepository
      .createQueryBuilder("r")
      .select(
        "COALESCE(SUM(r.full_widows + r.half_widows + r.life_time_full_widows + r.life_time_half_widows), 0)",
        "v",
      )
      .where("r.is_archived = false");
    applyDeliverablesDateFilter(qb, "r", "report_date", from, to);
    return Number((await qb.getRawOne<{ v: string }>())?.v ?? 0);
  }

  private async sumRationOrphans(from?: string, to?: string): Promise<number> {
    const qb = this.rationReportRepository
      .createQueryBuilder("r")
      .select(
        "COALESCE(SUM(r.full_orphan + r.half_orphan + r.life_time_full_orphan + r.life_time_half_orphan), 0)",
        "v",
      )
      .where("r.is_archived = false");
    applyDeliverablesDateFilter(qb, "r", "report_date", from, to);
    return Number((await qb.getRawOne<{ v: string }>())?.v ?? 0);
  }

  private async sumRationDivorced(from?: string, to?: string): Promise<number> {
    const qb = this.rationReportRepository
      .createQueryBuilder("r")
      .select(
        "COALESCE(SUM(r.full_divorced + r.half_divorced + r.life_time_full_divorced + r.life_time_half_divorced), 0)",
        "v",
      )
      .where("r.is_archived = false");
    applyDeliverablesDateFilter(qb, "r", "report_date", from, to);
    return Number((await qb.getRawOne<{ v: string }>())?.v ?? 0);
  }

  private async sumRationDisable(from?: string, to?: string): Promise<number> {
    const qb = this.rationReportRepository
      .createQueryBuilder("r")
      .select(
        "COALESCE(SUM(r.full_disable + r.half_disable + r.life_time_full_disable + r.life_time_half_disable), 0)",
        "v",
      )
      .where("r.is_archived = false");
    applyDeliverablesDateFilter(qb, "r", "report_date", from, to);
    return Number((await qb.getRawOne<{ v: string }>())?.v ?? 0);
  }

  private async sumRationIndegent(from?: string, to?: string): Promise<number> {
    const qb = this.rationReportRepository
      .createQueryBuilder("r")
      .select(
        "COALESCE(SUM(r.full_indegent + r.half_indegent + r.life_time_full_indegent + r.life_time_half_indegent), 0)",
        "v",
      )
      .where("r.is_archived = false");
    applyDeliverablesDateFilter(qb, "r", "report_date", from, to);
    return Number((await qb.getRawOne<{ v: string }>())?.v ?? 0);
  }

  private async sumFinancialWidow(from?: string, to?: string): Promise<number> {
    const qb = this.financialAssistanceReportRepository
      .createQueryBuilder("f")
      .select("COALESCE(SUM(f.widow), 0)", "v")
      .where("f.is_archived = false");
    applyDeliverablesDateFilter(qb, "f", "report_date", from, to);
    return Number((await qb.getRawOne<{ v: string }>())?.v ?? 0);
  }

  private async sumFinancialDivorced(
    from?: string,
    to?: string,
  ): Promise<number> {
    const qb = this.financialAssistanceReportRepository
      .createQueryBuilder("f")
      .select("COALESCE(SUM(f.divorced), 0)", "v")
      .where("f.is_archived = false");
    applyDeliverablesDateFilter(qb, "f", "report_date", from, to);
    return Number((await qb.getRawOne<{ v: string }>())?.v ?? 0);
  }

  private async sumFinancialDisable(
    from?: string,
    to?: string,
  ): Promise<number> {
    const qb = this.financialAssistanceReportRepository
      .createQueryBuilder("f")
      .select("COALESCE(SUM(f.disable), 0)", "v")
      .where("f.is_archived = false");
    applyDeliverablesDateFilter(qb, "f", "report_date", from, to);
    return Number((await qb.getRawOne<{ v: string }>())?.v ?? 0);
  }

  private async sumFinancialExtremePoor(
    from?: string,
    to?: string,
  ): Promise<number> {
    const qb = this.financialAssistanceReportRepository
      .createQueryBuilder("f")
      .select("COALESCE(SUM(f.extreme_poor), 0)", "v")
      .where("f.is_archived = false");
    applyDeliverablesDateFilter(qb, "f", "report_date", from, to);
    return Number((await qb.getRawOne<{ v: string }>())?.v ?? 0);
  }

  private async sumMarriageOrphans(
    from?: string,
    to?: string,
  ): Promise<number> {
    return this.sumColumn(
      this.marriageGiftReportRepository,
      "m",
      "report_date",
      "m.orphans",
      from,
      to,
    );
  }

  private async sumMarriageDivorced(
    from?: string,
    to?: string,
  ): Promise<number> {
    return this.sumColumn(
      this.marriageGiftReportRepository,
      "m",
      "report_date",
      "m.divorced",
      from,
      to,
    );
  }

  private async sumMarriageDisable(
    from?: string,
    to?: string,
  ): Promise<number> {
    return this.sumColumn(
      this.marriageGiftReportRepository,
      "m",
      "report_date",
      "m.disable",
      from,
      to,
    );
  }

  private async sumMarriageIndegent(
    from?: string,
    to?: string,
  ): Promise<number> {
    return this.sumColumn(
      this.marriageGiftReportRepository,
      "m",
      "report_date",
      "m.indegent",
      from,
      to,
    );
  }

  private async sumSewingOrphans(from?: string, to?: string): Promise<number> {
    return this.sumColumn(
      this.sewingMachineReportRepository,
      "s",
      "date",
      "s.orphans",
      from,
      to,
    );
  }

  private async sumSewingDivorced(from?: string, to?: string): Promise<number> {
    return this.sumColumn(
      this.sewingMachineReportRepository,
      "s",
      "date",
      "s.divorced",
      from,
      to,
    );
  }

  private async sumSewingDisable(from?: string, to?: string): Promise<number> {
    return this.sumColumn(
      this.sewingMachineReportRepository,
      "s",
      "date",
      "s.disable",
      from,
      to,
    );
  }

  private async sumSewingIndegent(from?: string, to?: string): Promise<number> {
    return this.sumColumn(
      this.sewingMachineReportRepository,
      "s",
      "date",
      "s.indegent",
      from,
      to,
    );
  }

  private async sumHealthWidows(from?: string, to?: string): Promise<number> {
    return this.sumColumn(
      this.healthReportRepository,
      "h",
      "date",
      "h.widows",
      from,
      to,
    );
  }

  private async sumHealthOrphans(from?: string, to?: string): Promise<number> {
    return this.sumColumn(
      this.healthReportRepository,
      "h",
      "date",
      "h.orphans",
      from,
      to,
    );
  }

  private async sumHealthDivorced(from?: string, to?: string): Promise<number> {
    return this.sumColumn(
      this.healthReportRepository,
      "h",
      "date",
      "h.divorced",
      from,
      to,
    );
  }

  private async sumHealthDisable(from?: string, to?: string): Promise<number> {
    return this.sumColumn(
      this.healthReportRepository,
      "h",
      "date",
      "h.disable",
      from,
      to,
    );
  }

  private async sumHealthIndegent(from?: string, to?: string): Promise<number> {
    return this.sumColumn(
      this.healthReportRepository,
      "h",
      "date",
      "h.indegent",
      from,
      to,
    );
  }

  private async sumEducationOrphans(
    from?: string,
    to?: string,
  ): Promise<number> {
    const qb = this.educationReportRepository
      .createQueryBuilder("e")
      .select("COALESCE(SUM(e.male_orphans + e.female_orphans), 0)", "v")
      .where("e.is_archived = false");
    applyDeliverablesDateFilter(qb, "e", "date", from, to);
    return Number((await qb.getRawOne<{ v: string }>())?.v ?? 0);
  }

  private async sumEducationDivorced(
    from?: string,
    to?: string,
  ): Promise<number> {
    const qb = this.educationReportRepository
      .createQueryBuilder("e")
      .select("COALESCE(SUM(e.male_divorced + e.female_divorced), 0)", "v")
      .where("e.is_archived = false");
    applyDeliverablesDateFilter(qb, "e", "date", from, to);
    return Number((await qb.getRawOne<{ v: string }>())?.v ?? 0);
  }

  private async sumEducationDisable(
    from?: string,
    to?: string,
  ): Promise<number> {
    const qb = this.educationReportRepository
      .createQueryBuilder("e")
      .select("COALESCE(SUM(e.male_disable + e.female_disable), 0)", "v")
      .where("e.is_archived = false");
    applyDeliverablesDateFilter(qb, "e", "date", from, to);
    return Number((await qb.getRawOne<{ v: string }>())?.v ?? 0);
  }

  private async sumEducationIndegent(
    from?: string,
    to?: string,
  ): Promise<number> {
    const qb = this.educationReportRepository
      .createQueryBuilder("e")
      .select("COALESCE(SUM(e.male_indegent + e.female_indegent), 0)", "v")
      .where("e.is_archived = false");
    applyDeliverablesDateFilter(qb, "e", "date", from, to);
    return Number((await qb.getRawOne<{ v: string }>())?.v ?? 0);
  }

  private async sumWheelOrphans(from?: string, to?: string): Promise<number> {
    return this.sumColumn(
      this.wheelChairOrCrutchesReportRepository,
      "w",
      "date",
      "w.orphans",
      from,
      to,
    );
  }

  private async sumWheelDivorced(from?: string, to?: string): Promise<number> {
    return this.sumColumn(
      this.wheelChairOrCrutchesReportRepository,
      "w",
      "date",
      "w.divorced",
      from,
      to,
    );
  }

  private async sumWheelDisable(from?: string, to?: string): Promise<number> {
    return this.sumColumn(
      this.wheelChairOrCrutchesReportRepository,
      "w",
      "date",
      "w.disable",
      from,
      to,
    );
  }

  private async sumWheelIndegent(from?: string, to?: string): Promise<number> {
    return this.sumColumn(
      this.wheelChairOrCrutchesReportRepository,
      "w",
      "date",
      "w.indegent",
      from,
      to,
    );
  }

  private async sumColumn(
    repo: Repository<any>,
    alias: string,
    dateColumn: "report_date" | "date",
    columnExpr: string,
    from?: string,
    to?: string,
  ): Promise<number> {
    const qb = repo
      .createQueryBuilder(alias)
      .select(`COALESCE(SUM(${columnExpr}), 0)`, "v")
      .where(`${alias}.is_archived = false`);
    applyDeliverablesDateFilter(qb, alias, dateColumn, from, to);
    return Number((await qb.getRawOne<{ v: string }>())?.v ?? 0);
  }
}
