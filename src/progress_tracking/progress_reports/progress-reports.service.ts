import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Donation } from "../../donations/entities/donation.entity";
import { ProgressWorkflowTemplate } from "../progress_workflow_templates/progress_workflow_template.entity";
import { ProgressTracker } from "../progress_trackers/progress_tracker.entity";

const COMPLETED_STATUS = "completed";

function parseIsoDateOnly(s?: string): Date | null {
  if (!s) return null;
  const v = String(s).trim();
  if (!v) return null;
  // Accept YYYY-MM-DD.
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return null;
  // Normalize to midnight UTC for consistent grouping with DATE_TRUNC.
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

@Injectable()
export class ProgressReportsService {
  constructor(
    @InjectRepository(Donation)
    private readonly donationsRepo: Repository<Donation>,
    @InjectRepository(ProgressWorkflowTemplate)
    private readonly templatesRepo: Repository<ProgressWorkflowTemplate>,
    @InjectRepository(ProgressTracker)
    private readonly trackersRepo: Repository<ProgressTracker>,
  ) {}

  async getTemplateTreeSummary(params: {
    template_id?: string;
    start_date?: string;
    end_date?: string;
    interval?: string; // daily|weekly|monthly (default daily)
  }): Promise<{
    parent: { id: number; name: string; code: string } | null;
    templates: Array<{ id: number; name: string; code: string }>;
    totals: Array<{ template_id: number; units: number }>;
    timeseries: Array<{
      period_start: string;
      template_id: number;
      units: number;
    }>;
  }> {
    const parentId = Number(params.template_id);
    if (!Number.isFinite(parentId) || parentId <= 0) {
      throw new BadRequestException("template_id is required");
    }

    const parent = await this.templatesRepo.findOne({
      where: { id: parentId, is_archived: false } as any,
      select: ["id", "name", "code"] as any,
    });
    if (!parent) throw new BadRequestException("Workflow template not found");

    const children = await this.templatesRepo.find({
      where: { parent_id: parentId, is_archived: false } as any,
      select: ["id", "name", "code"] as any,
      order: { id: "ASC" } as any,
    });
    const templates = (children?.length ? children : [parent]).map((t: any) => ({
      id: Number(t.id),
      name: String(t.name || ""),
      code: String(t.code || ""),
    }));
    const templateIds = templates.map((t) => t.id);

    const start = parseIsoDateOnly(params.start_date) ?? new Date("1970-01-01");
    const endRaw = parseIsoDateOnly(params.end_date) ?? new Date();
    // Make end inclusive by adding 1 day and using < endExclusive.
    const endExclusive = new Date(endRaw);
    endExclusive.setUTCDate(endExclusive.getUTCDate() + 1);
    endExclusive.setUTCHours(0, 0, 0, 0);

    const interval = String(params.interval || "daily").toLowerCase();
    const truncUnit = interval === "monthly" ? "month" : interval === "weekly" ? "week" : "day";

    // Units: for Qurbani-like templates we treat `batch_parts_count` as units when present,
    // otherwise count the tracker as 1 unit.
    const unitExpr = "COALESCE(NULLIF(t.batch_parts_count, 0), 1)";

    const totalsRows = await this.trackersRepo
      .createQueryBuilder("t")
      .innerJoin(Donation, "d", "d.id = t.donation_id")
      .select("t.template_id", "template_id")
      .addSelect(`COALESCE(SUM(${unitExpr}), 0)`, "units")
      .where("t.is_archived = false")
      .andWhere("t.template_id IN (:...tids)", { tids: templateIds })
      .andWhere("d.is_archived = false")
      .andWhere("LOWER(d.status) = :status", { status: COMPLETED_STATUS })
      .andWhere("d.date >= :start AND d.date < :end", { start, end: endExclusive })
      .groupBy("t.template_id")
      .orderBy("t.template_id", "ASC")
      .getRawMany<{ template_id: string; units: string }>();

    const totals = templates.map((tpl) => {
      const found = (totalsRows || []).find(
        (r) => Number(r.template_id) === tpl.id,
      );
      return {
        template_id: tpl.id,
        units: found ? Number(found.units || 0) : 0,
      };
    });

    const seriesRows = await this.trackersRepo
      .createQueryBuilder("t")
      .innerJoin(Donation, "d", "d.id = t.donation_id")
      .select(`DATE_TRUNC('${truncUnit}', d.date)`, "period_start")
      .addSelect("t.template_id", "template_id")
      .addSelect(`COALESCE(SUM(${unitExpr}), 0)`, "units")
      .where("t.is_archived = false")
      .andWhere("t.template_id IN (:...tids)", { tids: templateIds })
      .andWhere("d.is_archived = false")
      .andWhere("LOWER(d.status) = :status", { status: COMPLETED_STATUS })
      .andWhere("d.date >= :start AND d.date < :end", { start, end: endExclusive })
      .groupBy("period_start")
      .addGroupBy("t.template_id")
      .orderBy("period_start", "ASC")
      .addOrderBy("t.template_id", "ASC")
      .getRawMany<{ period_start: Date; template_id: string; units: string }>();

    const timeseries = (seriesRows || []).map((r) => ({
      period_start: new Date(r.period_start).toISOString().slice(0, 10),
      template_id: Number(r.template_id),
      units: Number(r.units || 0),
    }));

    return {
      parent: { id: parent.id, name: parent.name, code: parent.code },
      templates,
      totals,
      timeseries,
    };
  }
}

