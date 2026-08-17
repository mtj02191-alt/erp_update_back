import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { DeepPartial, IsNull, Not, Repository } from "typeorm";
import * as crypto from "crypto";
import { ProgressTracker } from "./progress_tracker.entity";
import { ProgressTrackerStep } from "./progress_tracker_step.entity";
import { ProgressStepEvidence } from "./progress_step_evidence.entity";
import { ProgressWorkflowTemplate } from "../progress_workflow_templates/progress_workflow_template.entity";
import { ProgressWorkflowTemplateStep } from "../progress_workflow_templates/progress_workflow_template_step.entity";
import { CreateTrackerDto } from "./dto/create-tracker.dto";
import { UpdateTrackerDto } from "./dto/update-tracker.dto";
import { UpdateTrackerStepStatusDto } from "./dto/update-tracker-step-status.dto";
import { AddEvidenceDto } from "./dto/add-evidence.dto";
import {
  ProgressStatus,
  TrackerOverallStatus,
  ParentEntityType,
} from "../common/progress-tracking.enum";
import { ProgressNotificationsService } from "../progress_notifications/progress-notifications.service";
import { Donation } from "../../donations/entities/donation.entity";
import { ProgressBatchStepEvidence } from "../progress_batches/progress_batch_step_evidence.entity";
import { ProgressWorkflowBatch } from "../progress_batches/progress_workflow_batch.entity";
import { DonationBatchAllocation } from "../progress_batches/donation_batch_allocation.entity";
import { ProgressBatchesService } from "../progress_batches/progress-batches.service";

@Injectable()
export class ProgressTrackersService {
  constructor(
    @InjectRepository(ProgressTracker)
    private readonly trackersRepo: Repository<ProgressTracker>,
    @InjectRepository(ProgressTrackerStep)
    private readonly trackerStepsRepo: Repository<ProgressTrackerStep>,
    @InjectRepository(ProgressStepEvidence)
    private readonly evidenceRepo: Repository<ProgressStepEvidence>,
    @InjectRepository(ProgressWorkflowTemplate)
    private readonly templatesRepo: Repository<ProgressWorkflowTemplate>,
    @InjectRepository(ProgressWorkflowTemplateStep)
    private readonly templateStepsRepo: Repository<ProgressWorkflowTemplateStep>,
    private readonly notifications: ProgressNotificationsService,
    @InjectRepository(Donation)
    private readonly donationsRepo: Repository<Donation>,
    @InjectRepository(ProgressBatchStepEvidence)
    private readonly batchEvidenceRepo: Repository<ProgressBatchStepEvidence>,
    @InjectRepository(ProgressWorkflowBatch)
    private readonly workflowBatchesRepo: Repository<ProgressWorkflowBatch>,
    @InjectRepository(DonationBatchAllocation)
    private readonly allocationsRepo: Repository<DonationBatchAllocation>,
    private readonly progressBatchesService: ProgressBatchesService,
  ) {}

  private deriveOverallStatus(
    steps: ProgressTrackerStep[],
  ): TrackerOverallStatus {
    const active = steps.filter((s) => !s.is_archived);
    if (active.length === 0) return TrackerOverallStatus.PENDING;
    if (active.every((s) => s.status === ProgressStatus.CANCELLED))
      return TrackerOverallStatus.CANCELLED;
    if (
      active.every(
        (s) =>
          s.status === ProgressStatus.COMPLETED ||
          s.status === ProgressStatus.SKIPPED,
      )
    )
      return TrackerOverallStatus.COMPLETED;
    if (
      active.some(
        (s) =>
          s.status === ProgressStatus.IN_PROGRESS ||
          s.status === ProgressStatus.COMPLETED,
      )
    )
      return TrackerOverallStatus.IN_PROGRESS;
    return TrackerOverallStatus.PENDING;
  }

  private validateTransition(from: ProgressStatus, to: ProgressStatus) {
    const allowed: Record<ProgressStatus, ProgressStatus[]> = {
      [ProgressStatus.PENDING]: [
        ProgressStatus.IN_PROGRESS,
        ProgressStatus.COMPLETED,
        ProgressStatus.SKIPPED,
        ProgressStatus.CANCELLED,
      ],
      [ProgressStatus.IN_PROGRESS]: [
        ProgressStatus.COMPLETED,
        ProgressStatus.CANCELLED,
      ],
      [ProgressStatus.COMPLETED]: [],
      [ProgressStatus.SKIPPED]: [],
      [ProgressStatus.CANCELLED]: [],
    };
    if (!allowed[from]?.includes(to)) {
      throw new BadRequestException(
        `Invalid step transition: ${from} -> ${to}`,
      );
    }
  }

  private async resolveTemplateStepsWithParentFallback(
    templateId: number,
  ): Promise<{
    steps: ProgressWorkflowTemplateStep[];
    source_template_id: number;
  }> {
    let currentId: number | null = templateId;
    const visited = new Set<number>();

    for (let depth = 0; depth < 20 && currentId; depth += 1) {
      if (visited.has(currentId)) {
        throw new BadRequestException("Template parent cycle detected");
      }
      visited.add(currentId);

      const steps = await this.templateStepsRepo.find({
        where: { template_id: currentId, is_archived: false },
        order: { step_order: "ASC" },
      });
      if (steps.length) return { steps, source_template_id: currentId };

      const t = await this.templatesRepo.findOne({
        where: { id: currentId, is_archived: false } as any,
        select: ["id", "parent_id"] as any,
      });
      if (!t) break;
      currentId = (t as any).parent_id ?? null;
    }

    throw new BadRequestException(
      "Template has no steps (and no parent steps)",
    );
  }

  async createTrackerFromTemplate(dto: CreateTrackerDto, currentUser?: any) {
    const template = await this.templatesRepo.findOne({
      where: { id: dto.template_id, is_archived: false },
    });
    if (!template) throw new NotFoundException("Template not found");

    const donationId = dto.donation_id ?? null;
    if (donationId) {
      const existing = await this.trackersRepo.findOne({
        where: {
          donation_id: donationId,
          template_id: dto.template_id,
          is_archived: false,
        } as any,
      });
      if (existing)
        throw new ConflictException(
          "Tracker already exists for this donation and workflow template",
        );
    }

    const trackerEntity = this.trackersRepo.create({
      template_id: template.id,
      donation_id: donationId,
      parent_type:
        dto.parent_type || (donationId ? ParentEntityType.DONATION : null),
      parent_id: dto.parent_id || (donationId ? donationId : null),
      donor_visible: dto.donor_visible ?? true,
      batch_parts_count: dto.batch_parts_count ?? null,
      public_tracking_token: null,
      overall_status: TrackerOverallStatus.PENDING,
      created_by: currentUser?.id === -1 ? null : currentUser,
      updated_by: currentUser?.id === -1 ? null : currentUser,
    } as any);
    const savedTracker = await this.trackersRepo.save(trackerEntity);
    const tracker = Array.isArray(savedTracker)
      ? savedTracker[0]
      : savedTracker;

    const { steps: templateSteps } =
      await this.resolveTemplateStepsWithParentFallback(template.id);

    const stepRows: DeepPartial<ProgressTrackerStep>[] = templateSteps.map(
      (ts) => ({
        tracker_id: tracker.id,
        batch_id: null,
        template_step_id: ts.id,
        step_key: ts.step_key,
        title: ts.title,
        step_order: ts.step_order,
        status: ProgressStatus.PENDING,
        donor_visible: true,
        created_by: currentUser?.id === -1 ? null : currentUser,
        updated_by: currentUser?.id === -1 ? null : currentUser,
      }),
    );
    await this.trackerStepsRepo.save(
      stepRows.map((row) => this.trackerStepsRepo.create(row)),
    );

    return this.getTrackerDetail(tracker.id);
  }

  /**
   * For batchable templates: after `donation_batch_allocations` rows exist, materialize
   * one full set of tracker steps per physical batch, then archive template-wide
   * (`batch_id` null) placeholder steps for that tracker.
   */
  async syncBatchScopedStepsForDonationTemplate(
    donationId: number,
    templateId: number,
    currentUser?: any,
  ): Promise<void> {
    const tid = Number(templateId);
    const did = Number(donationId);
    if (!Number.isFinite(tid) || tid <= 0 || !Number.isFinite(did) || did <= 0)
      return;

    const template = await this.templatesRepo.findOne({
      where: { id: tid, is_archived: false } as any,
      select: ["id", "is_batchable"] as any,
    });
    if (!template || !(template as any).is_batchable) return;

    const tracker = await this.trackersRepo.findOne({
      where: {
        donation_id: did,
        template_id: tid,
        is_archived: false,
      } as any,
    });
    if (!tracker) return;

    const allocs = await this.allocationsRepo.find({
      where: {
        donation_id: did,
        template_id: tid,
        is_archived: false,
      } as any,
      select: ["batch_id"] as any,
    });
    const batchIds = Array.from(
      new Set(
        (allocs || [])
          .map((a: any) => Number(a.batch_id))
          .filter((x) => Number.isFinite(x) && x > 0),
      ),
    );
    if (!batchIds.length) return;

    const { steps: templateSteps } =
      await this.resolveTemplateStepsWithParentFallback(tid);

    const auditUser =
      currentUser?.id === -1 ? null : currentUser ?? null;

    for (const batchId of batchIds) {
      const existing = await this.trackerStepsRepo.count({
        where: {
          tracker_id: tracker.id,
          batch_id: batchId,
          is_archived: false,
        } as any,
      });
      if (existing >= templateSteps.length) continue;
      if (existing > 0) continue;

      const stepRows: DeepPartial<ProgressTrackerStep>[] = templateSteps.map(
        (ts) => ({
          tracker_id: tracker.id,
          batch_id: batchId,
          template_step_id: ts.id,
          step_key: ts.step_key,
          title: ts.title,
          step_order: ts.step_order,
          status: ProgressStatus.PENDING,
          donor_visible: true,
          created_by: auditUser,
          updated_by: auditUser,
        }),
      );
      await this.trackerStepsRepo.save(
        stepRows.map((row) => this.trackerStepsRepo.create(row)),
      );
    }

    const perBatchCount = await this.trackerStepsRepo.count({
      where: {
        tracker_id: tracker.id,
        batch_id: Not(IsNull()),
        is_archived: false,
      } as any,
    });
    if (perBatchCount > 0) {
      await this.trackerStepsRepo.update(
        {
          tracker_id: tracker.id,
          batch_id: IsNull(),
          is_archived: false,
        } as any,
        {
          is_archived: true,
          updated_by: auditUser,
        } as any,
      );
    }
  }

  async listTrackers(options?: {
    page?: number;
    pageSize?: number;
    search?: string;
    template_id?: number;
    donation_id?: number;
    batch_id?: number;
    batch_number?: number;
    batch_status?: "open" | "closed";
  }) {
    const page = options?.page || 1;
    const pageSize = options?.pageSize || 10;
    const skip = (page - 1) * pageSize;

    const qb = this.trackersRepo
      .createQueryBuilder("t")
      .leftJoinAndSelect("t.template", "template")
      // For listing UI: compute the earliest batch number linked to this donation (if any).
      .addSelect((subQb) => {
        return subQb
          .select("MIN(batch.batch_number)", "min_batch_number")
          .from("donation_batch_allocations", "alloc2")
          .innerJoin(
            "progress_workflow_batches",
            "batch",
            "batch.id = alloc2.batch_id AND batch.is_archived = false",
          )
          .where("alloc2.is_archived = false")
          .andWhere("alloc2.donation_id = t.donation_id")
          .andWhere("alloc2.template_id = t.template_id");
      }, "batch_number")
      .where("t.is_archived = false");

    if (options?.batch_id || options?.batch_number || options?.batch_status) {
      qb.leftJoin(
        "donation_batch_allocations",
        "alloc",
        "alloc.donation_id = t.donation_id AND alloc.is_archived = false AND alloc.template_id = t.template_id",
      ).leftJoin(
        "progress_workflow_batches",
        "batch",
        "batch.id = alloc.batch_id AND batch.is_archived = false",
      );

      if (options?.batch_id)
        qb.andWhere("batch.id = :bid", { bid: options.batch_id });
      if (options?.batch_number)
        qb.andWhere("batch.batch_number = :bn", { bn: options.batch_number });
      if (options?.batch_status === "open")
        qb.andWhere("batch.is_closed = false");
      if (options?.batch_status === "closed")
        qb.andWhere("batch.is_closed = true");

      qb.distinct(true);
    }

    if (options?.template_id)
      qb.andWhere("t.template_id = :templateId", {
        templateId: options.template_id,
      });
    if (options?.donation_id)
      qb.andWhere("t.donation_id = :donationId", {
        donationId: options.donation_id,
      });

    if (options?.search) {
      qb.andWhere(
        "(template.name ILIKE :q OR template.code ILIKE :q OR CAST(t.donation_id AS text) ILIKE :q)",
        { q: `%${options.search}%` },
      );
    }

    const total = await qb
      .clone()
      .orderBy()
      .skip(undefined as any)
      .take(undefined as any)
      .getCount();

    qb.orderBy("t.created_at", "DESC").skip(skip).take(pageSize);
    const { entities, raw } = await qb.getRawAndEntities();
    const data = entities.map((e: any, idx: number) => ({
      ...e,
      batch_number:
        raw?.[idx]?.batch_number != null ? Number(raw[idx].batch_number) : null,
    }));

    for (const row of data as any[]) {
      row.allocation_batches = [];
      const did = row.donation_id != null ? Number(row.donation_id) : NaN;
      const tid = row.template_id != null ? Number(row.template_id) : NaN;
      if (!Number.isFinite(did) || did <= 0 || !Number.isFinite(tid) || tid <= 0)
        continue;

      const rawBatches = await this.allocationsRepo
        .createQueryBuilder("a")
        .innerJoin(
          ProgressWorkflowBatch,
          "b",
          "b.id = a.batch_id AND b.is_archived = false",
        )
        .where("a.is_archived = false")
        .andWhere("a.donation_id = :did", { did })
        .andWhere("a.template_id = :tid", { tid })
        .select("a.batch_id", "batch_id")
        .addSelect("b.batch_number", "batch_number")
        .addSelect("a.parts_count", "parts_count")
        .orderBy("b.batch_number", "ASC")
        .getRawMany();

      const seen = new Set<number>();
      for (const r of rawBatches || []) {
        const raw = r as Record<string, unknown>;
        const bid = Number(
          raw.batch_id ?? raw.a_batch_id ?? raw.donation_batch_allocations_batch_id,
        );
        const bnum = Number(
          raw.batch_number ?? raw.b_batch_number ?? raw.progress_workflow_batches_batch_number,
        );
        const parts = Number(
          raw.parts_count ?? raw.a_parts_count ?? raw.donation_batch_allocations_parts_count,
        );
        if (!Number.isFinite(bid) || bid <= 0 || seen.has(bid)) continue;
        seen.add(bid);
        (row.allocation_batches as any[]).push({
          batch_id: bid,
          batch_number: Number.isFinite(bnum) && bnum > 0 ? bnum : bid,
          parts_count: Number.isFinite(parts) && parts > 0 ? parts : 0,
        });
      }
    }

    const totalPages = Math.ceil(total / pageSize);
    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async getTrackerDetail(trackerId: number) {
    const tracker = await this.trackersRepo.findOne({
      where: { id: trackerId, is_archived: false },
      relations: ["template", "steps", "steps.evidence", "steps.batch"],
    });
    if (!tracker) throw new NotFoundException("Tracker not found");
    tracker.steps = (tracker.steps || [])
      .filter((s) => !s.is_archived)
      .sort((a, b) => a.step_order - b.step_order);
    await this.attachBatchEvidenceIfApplicable(tracker as any);
    return tracker;
  }

  async findTrackersByDonationId(donationId: number): Promise<
    Array<{
      id: number;
      template_id: number;
      batch_parts_count: number | null;
    }>
  > {
    const rows = await this.trackersRepo.find({
      where: { donation_id: donationId, is_archived: false },
      order: { id: "ASC" },
      select: ["id", "template_id", "batch_parts_count"] as any,
    });
    return (rows || []).map((r: any) => ({
      id: Number(r.id),
      template_id: Number(r.template_id),
      batch_parts_count:
        r.batch_parts_count != null ? Number(r.batch_parts_count) : null,
    }));
  }

  /**
   * All active trackers for a donation (one per workflow template is typical).
   * Each entry is the same shape as getTrackerDetail (steps, template, batch evidence, etc.).
   */
  async getAllTrackersByDonationId(donationId: number): Promise<ProgressTracker[]> {
    const rows = await this.trackersRepo.find({
      where: { donation_id: donationId, is_archived: false },
      order: { id: "ASC" },
      select: ["id"] as any,
    });
    const out: ProgressTracker[] = [];
    for (const r of rows || []) {
      const tid = Number((r as any)?.id);
      if (!Number.isFinite(tid) || tid <= 0) continue;
      out.push(await this.getTrackerDetail(tid));
    }
    return out;
  }

  /** @deprecated Prefer getAllTrackersByDonationId — kept for callers that expect a single tracker. */
  async getTrackerByDonationId(donationId: number) {
    const all = await this.getAllTrackersByDonationId(donationId);
    if (!all.length) throw new NotFoundException("Tracker not found for donation");
    return all[0];
  }

  async updateTracker(
    trackerId: number,
    dto: UpdateTrackerDto,
    currentUser?: any,
  ) {
    const tracker = await this.trackersRepo.findOne({
      where: { id: trackerId, is_archived: false },
    });
    if (!tracker) throw new NotFoundException("Tracker not found");
    await this.trackersRepo.update(trackerId, {
      ...dto,
      updated_by: currentUser?.id === -1 ? null : currentUser,
    } as any);
    return this.getTrackerDetail(trackerId);
  }

  /**
   * Add extra parts/shares for an existing donation tracker (batchable templates only).
   * This is additive and does not change existing create-tracker behavior.
   */
  async allocateMoreParts(
    trackerId: number,
    partsRequested: number,
    currentUser?: any,
  ) {
    const tr = await this.trackersRepo.findOne({
      where: { id: trackerId, is_archived: false } as any,
      relations: ["template"] as any,
    });
    if (!tr) throw new NotFoundException("Tracker not found");
    const donationId =
      (tr as any).donation_id != null ? Number((tr as any).donation_id) : NaN;
    if (!Number.isFinite(donationId) || donationId <= 0) {
      throw new BadRequestException(
        "This tracker is not linked to a donation",
      );
    }

    const templateId =
      (tr as any).template_id != null ? Number((tr as any).template_id) : NaN;
    if (!Number.isFinite(templateId) || templateId <= 0) {
      throw new BadRequestException("Invalid tracker template_id");
    }

    const template = (tr as any).template;
    if (!template || (template as any).is_batchable !== true) {
      throw new BadRequestException("Workflow template is not batchable");
    }

    const n = Number(partsRequested || 0);
    if (!Number.isFinite(n) || n <= 0) {
      throw new BadRequestException(
        "parts_requested must be a positive integer",
      );
    }

    await this.progressBatchesService.allocateDonationIntoBatches({
      template_id: templateId,
      donation_id: donationId,
      parts_requested: n,
      currentUser,
    });

    const prev =
      (tr as any).batch_parts_count != null
        ? Number((tr as any).batch_parts_count)
        : 0;
    const next = (Number.isFinite(prev) && prev > 0 ? prev : 0) + n;
    await this.trackersRepo.update(trackerId, {
      batch_parts_count: next,
      updated_by: currentUser?.id === -1 ? null : currentUser,
    } as any);

    await this.syncBatchScopedStepsForDonationTemplate(
      donationId,
      templateId,
      currentUser,
    );

    return this.getTrackerDetail(trackerId);
  }

  async generateOrRegenerateToken(trackerId: number, currentUser?: any) {
    const tracker = await this.trackersRepo.findOne({
      where: { id: trackerId, is_archived: false },
    });
    if (!tracker) throw new NotFoundException("Tracker not found");
    const token = crypto.randomBytes(24).toString("hex");
    await this.trackersRepo.update(trackerId, {
      public_tracking_token: token,
      updated_by: currentUser?.id === -1 ? null : currentUser,
    } as any);
    return { token };
  }

  async listSteps(trackerId: number) {
    const steps = await this.trackerStepsRepo.find({
      where: { tracker_id: trackerId, is_archived: false },
      relations: ["evidence", "batch"],
      order: { step_order: "ASC" },
    });
    // Attach shared batch evidence (if any) by resolving tracker.
    const tracker = await this.trackersRepo.findOne({
      where: { id: trackerId, is_archived: false },
      relations: ["template"] as any,
    });
    if (tracker) {
      await this.attachBatchEvidenceToSteps({
        donationId: tracker.donation_id,
        templateId: tracker.template_id,
        steps: steps as any,
      });
    }
    return steps;
  }

  private async attachBatchEvidenceIfApplicable(
    tracker: ProgressTracker,
  ): Promise<void> {
    if (!tracker?.template_id || !tracker?.donation_id) return;
    await this.attachBatchEvidenceToSteps({
      donationId: tracker.donation_id,
      templateId: tracker.template_id,
      steps: (tracker as any).steps || [],
    });
  }

  private async attachBatchEvidenceToSteps(params: {
    donationId: number | null;
    templateId: number | null;
    steps: Array<any>;
  }): Promise<void> {
    const donationId =
      params.donationId != null ? Number(params.donationId) : NaN;
    const templateId =
      params.templateId != null ? Number(params.templateId) : NaN;
    if (!Number.isFinite(donationId) || donationId <= 0) return;
    if (!Number.isFinite(templateId) || templateId <= 0) return;

    const template = await this.templatesRepo.findOne({
      where: { id: templateId, is_archived: false } as any,
      select: ["id", "is_batchable"] as any,
    });
    if (!template || !(template as any).is_batchable) return;

    const allocs = await this.allocationsRepo.find({
      where: {
        donation_id: donationId,
        template_id: templateId,
        is_archived: false,
      } as any,
      select: ["batch_id"] as any,
    });
    const batchIds = Array.from(
      new Set(
        (allocs || [])
          .map((a: any) => Number(a.batch_id))
          .filter((x) => Number.isFinite(x)),
      ),
    );
    if (!batchIds.length) return;

    const batches = await this.workflowBatchesRepo.find({
      where: batchIds.map((id) => ({ id, is_archived: false }) as any) as any,
      select: ["id", "batch_number"] as any,
    });
    const batchNumberById = new Map<number, number>();
    (batches || []).forEach((b: any) => {
      batchNumberById.set(Number(b.id), Number(b.batch_number));
    });

    const stepKeys = Array.from(
      new Set(
        (params.steps || [])
          .map((s) => String(s.step_key || ""))
          .filter(Boolean),
      ),
    );
    if (!stepKeys.length) return;

    const batchEvidence = await this.batchEvidenceRepo
      .createQueryBuilder("e")
      .where("e.is_archived = false")
      .andWhere("e.batch_id IN (:...batchIds)", { batchIds })
      .andWhere("e.step_key IN (:...stepKeys)", { stepKeys })
      .orderBy("e.sort_order", "ASC")
      .addOrderBy("e.created_at", "ASC")
      .getMany();

    const byStepKey = new Map<string, any[]>();
    for (const ev of batchEvidence || []) {
      const key = String((ev as any).step_key || "");
      if (!key) continue;
      const bn = batchNumberById.get(Number((ev as any).batch_id)) || null;
      const wrapped = {
        ...ev,
        evidence_scope: "batch",
        evidence_label: bn ? `Batch #${bn} evidence` : "Batch evidence",
        batch_id: (ev as any).batch_id,
        batch_number: bn,
      };
      const mapKey = `${key}::${Number((ev as any).batch_id)}`;
      byStepKey.set(mapKey, [...(byStepKey.get(mapKey) || []), wrapped]);
    }

    for (const s of params.steps || []) {
      const key = String(s.step_key || "");
      if (!key) continue;
      const bid =
        (s as any).batch_id != null &&
        Number.isFinite(Number((s as any).batch_id))
          ? Number((s as any).batch_id)
          : null;
      let shared: any[] = [];
      if (bid != null) {
        shared = byStepKey.get(`${key}::${bid}`) || [];
      } else {
        for (const [mk, arr] of byStepKey) {
          if (mk.startsWith(`${key}::`)) shared.push(...(arr || []));
        }
      }
      if (!shared.length) continue;
      const own = Array.isArray(s.evidence) ? s.evidence : [];
      s.evidence = [...shared, ...own];
    }
  }

  private async resolveBatchTrackerIdsForDonation(params: {
    donationId: number;
    templateId: number;
  }): Promise<number[]> {
    const template = await this.templatesRepo.findOne({
      where: { id: params.templateId, is_archived: false } as any,
      select: ["id", "is_batchable"] as any,
    });
    if (!template || !(template as any).is_batchable) return [];

    const allocs = await this.allocationsRepo.find({
      where: {
        donation_id: params.donationId,
        template_id: params.templateId,
        is_archived: false,
      } as any,
      select: ["batch_id"] as any,
    });
    const batchIds = Array.from(
      new Set(
        (allocs || [])
          .map((a: any) => Number(a.batch_id))
          .filter((x) => Number.isFinite(x) && x > 0),
      ),
    );
    if (!batchIds.length) return [];

    const trackerRows = await this.trackersRepo
      .createQueryBuilder("t")
      .innerJoin(
        "donation_batch_allocations",
        "a",
        "a.donation_id = t.donation_id AND a.is_archived = false AND a.template_id = :templateId AND a.batch_id IN (:...batchIds)",
        { templateId: params.templateId, batchIds },
      )
      .where("t.is_archived = false")
      .andWhere("t.template_id = :templateId2", {
        templateId2: params.templateId,
      })
      .andWhere("t.donation_id = :donationId", {
        donationId: params.donationId,
      })
      .select(["t.id AS id"])
      .distinct(true)
      .getRawMany<{ id: string }>();

    return (trackerRows || [])
      .map((r) => Number(r.id))
      .filter((x) => Number.isFinite(x) && x > 0);
  }

  async updateStep(
    stepId: number,
    dto: UpdateTrackerStepStatusDto,
    currentUser?: any,
  ) {
    const step = await this.trackerStepsRepo.findOne({
      where: { id: stepId, is_archived: false },
      relations: ["tracker", "tracker.template", "tracker.donation"],
    });
    if (!step) throw new NotFoundException("Tracker step not found");

    const nextStatus = dto.status ?? step.status;
    if (dto.status !== undefined && dto.status !== step.status) {
      this.validateTransition(step.status, dto.status);
    }

    const now = new Date();
    const updateData: any = {
      status: nextStatus,
      updated_by: currentUser?.id === -1 ? null : currentUser,
    };

    if (dto.notes !== undefined) updateData.notes = dto.notes;
    if (dto.donor_visible !== undefined)
      updateData.donor_visible = dto.donor_visible;
    if (dto.donor_notified !== undefined)
      updateData.donor_notified = dto.donor_notified;

    if (nextStatus === ProgressStatus.IN_PROGRESS && !step.started_at)
      updateData.started_at = now;
    if (nextStatus === ProgressStatus.COMPLETED) updateData.completed_at = now;
    if (nextStatus === ProgressStatus.SKIPPED) updateData.skipped_at = now;
    if (nextStatus === ProgressStatus.CANCELLED) updateData.cancelled_at = now;

    await this.trackerStepsRepo.update(stepId, updateData);

    // BATCHING: If the template is batchable and this step is batch-scoped,
    // propagate the same step_key status update to ALL donations occupying the same batch.
    try {
      const templateId = (step as any)?.tracker?.template_id;
      const donationId = (step as any)?.tracker?.donation_id;
      const stepKey = String((step as any)?.step_key || "");
      if (templateId && donationId && stepKey && dto.status !== undefined) {
        const stepBatchId = (step as any)?.batch_id;
        if (
          stepBatchId != null &&
          String(stepBatchId).trim() !== "" &&
          Number.isFinite(Number(stepBatchId))
        ) {
          // Update batch-scoped steps across all trackers sharing the same batch_id.
          await this.trackerStepsRepo
            .createQueryBuilder()
            .update()
            .set(updateData)
            .where("is_archived = false")
            .andWhere("batch_id = :bid", { bid: Number(stepBatchId) })
            .andWhere("step_key = :stepKey", { stepKey })
            .andWhere("status = :fromStatus", { fromStatus: step.status })
            .execute();

          // Recompute overall status for affected trackers (best-effort).
          const trackerRows = await this.trackerStepsRepo
            .createQueryBuilder("s")
            .select("DISTINCT s.tracker_id", "tracker_id")
            .where("s.is_archived = false")
            .andWhere("s.batch_id = :bid", { bid: Number(stepBatchId) })
            .getRawMany<{ tracker_id: string }>();
          const trackerIds = (trackerRows || [])
            .map((r) => Number(r.tracker_id))
            .filter((x) => Number.isFinite(x) && x > 0);
          if (trackerIds.length) {
            const trackers = await this.trackersRepo.find({
              where: trackerIds.map(
                (id) => ({ id, is_archived: false }) as any,
              ) as any,
              relations: ["steps"] as any,
            });
            for (const tr of trackers || []) {
              const overall = this.deriveOverallStatus(
                ((tr as any).steps || []).filter((s: any) => !s.is_archived),
              );
              await this.trackersRepo.update((tr as any).id, {
                overall_status: overall,
              } as any);
            }
          }
        }
      }
    } catch (e) {
      // Best-effort; don't block the main step update.
    }

    const tracker = await this.trackersRepo.findOne({
      where: { id: step.tracker_id },
      relations: ["steps", "donation", "donation.donor"] as any,
    });
    if (tracker) {
      const overall = this.deriveOverallStatus(
        (tracker.steps || []).filter((s) => !s.is_archived),
      );
      await this.trackersRepo.update(tracker.id, {
        overall_status: overall,
      } as any);
    }

    const updatedStep = await this.trackerStepsRepo.findOne({
      where: { id: stepId },
      relations: ["evidence"],
    });

    if (nextStatus === ProgressStatus.COMPLETED) {
      try {
        const templateStep = step.template_step_id
          ? await this.templateStepsRepo.findOne({
              where: { id: step.template_step_id },
            })
          : null;
        if (templateStep?.notify_donor_on_complete) {
          const trackerFull = await this.trackersRepo.findOne({
            where: { id: step.tracker_id },
            relations: ["donation", "donation.donor"] as any,
          });
          const donor = (trackerFull as any)?.donation?.donor as any;
          const publicUrl = trackerFull?.public_tracking_token
            ? `${process.env.BASE_Frontend_URL || ""}/tracking/${trackerFull.public_tracking_token}`
            : null;
          await this.notifications.notifyDonorOnStepCompleted({
            tracker: trackerFull,
            step: updatedStep as any,
            recipientEmail: donor?.email || null,
            recipientPhone: donor?.phone || null,
            publicUrl,
          });

          // Later, WhatsApp/email integration can control this more precisely.
          // For now, consider "notify attempted successfully" as "notified".
          await this.trackerStepsRepo.update(stepId, {
            donor_notified: true,
          } as any);
        }
      } catch (e) {
        // notifications are best-effort; logs handle visibility
      }
    }

    return updatedStep;
  }

  async addEvidence(stepId: number, dto: AddEvidenceDto, currentUser?: any) {
    const step = await this.trackerStepsRepo.findOne({
      where: { id: stepId, is_archived: false },
      relations: ["tracker", "tracker.template"] as any,
    });
    if (!step) throw new NotFoundException("Tracker step not found");

    const templateId = (step as any)?.tracker?.template_id;
    const donationId = (step as any)?.tracker?.donation_id;

    const template = templateId
      ? await this.templatesRepo.findOne({
          where: { id: Number(templateId), is_archived: false } as any,
          select: ["id", "is_batchable"] as any,
        })
      : null;

    if (template && (template as any).is_batchable && donationId) {
      const allocs = await this.allocationsRepo.find({
        where: {
          donation_id: Number(donationId),
          template_id: Number(templateId),
          is_archived: false,
        } as any,
        select: ["batch_id"] as any,
      });
      const batchIds = Array.from(
        new Set(
          (allocs || [])
            .map((a: any) => Number(a.batch_id))
            .filter((x) => Number.isFinite(x) && x > 0),
        ),
      );

      const stepBatchId = (step as any).batch_id;
      if (
        stepBatchId != null &&
        Number.isFinite(Number(stepBatchId)) &&
        batchIds.includes(Number(stepBatchId))
      ) {
        // Batch-scoped step: evidence must be shared across ALL donations occupying this batch.
        const ev = this.batchEvidenceRepo.create({
          batch_id: Number(stepBatchId),
          step_key: (step as any).step_key,
          ...dto,
          created_by: currentUser?.id === -1 ? null : currentUser,
          updated_by: currentUser?.id === -1 ? null : currentUser,
        } as any);
        const saved = await this.batchEvidenceRepo.save(ev as any);
        return { created: 1, scope: "batch" } as any;
      }

      if (!batchIds.length) {
        const evidence = this.evidenceRepo.create({
          tracker_step_id: stepId,
          ...dto,
          created_by: currentUser?.id === -1 ? null : currentUser,
          updated_by: currentUser?.id === -1 ? null : currentUser,
        } as any);
        return this.evidenceRepo.save(evidence);
      }

      const created: ProgressBatchStepEvidence[] = [];
      for (const batchId of batchIds) {
        const ev = this.batchEvidenceRepo.create({
          batch_id: batchId,
          step_key: (step as any).step_key,
          ...dto,
          created_by: currentUser?.id === -1 ? null : currentUser,
          updated_by: currentUser?.id === -1 ? null : currentUser,
        } as any);
        const saved = await this.batchEvidenceRepo.save(ev as any);
        created.push(Array.isArray(saved) ? saved[0] : saved);
      }
      return { created: created.length, scope: "batch" } as any;
    }

    const evidence = this.evidenceRepo.create({
      tracker_step_id: stepId,
      ...dto,
      created_by: currentUser?.id === -1 ? null : currentUser,
      updated_by: currentUser?.id === -1 ? null : currentUser,
    } as any);
    return this.evidenceRepo.save(evidence);
  }

  async updateEvidence(
    evidenceId: number,
    dto: Partial<AddEvidenceDto>,
    currentUser?: any,
  ) {
    const existing = await this.evidenceRepo.findOne({
      where: { id: evidenceId, is_archived: false },
    });
    if (existing) {
      await this.evidenceRepo.update(evidenceId, {
        ...dto,
        updated_by: currentUser?.id === -1 ? null : currentUser,
      } as any);
      return this.evidenceRepo.findOne({ where: { id: evidenceId } });
    }

    const batchExisting = await this.batchEvidenceRepo.findOne({
      where: { id: evidenceId, is_archived: false } as any,
    });
    if (!batchExisting) throw new NotFoundException("Evidence not found");
    await this.batchEvidenceRepo.update(evidenceId, {
      ...dto,
      updated_by: currentUser?.id === -1 ? null : currentUser,
    } as any);
    return this.batchEvidenceRepo.findOne({ where: { id: evidenceId } as any });
  }

  async archiveEvidence(evidenceId: number, currentUser?: any) {
    const existing = await this.evidenceRepo.findOne({
      where: { id: evidenceId, is_archived: false },
    });
    if (existing) {
      await this.evidenceRepo.update(evidenceId, {
        is_archived: true,
        updated_by: currentUser?.id === -1 ? null : currentUser,
      } as any);
      return { message: "Evidence archived" };
    }

    const batchExisting = await this.batchEvidenceRepo.findOne({
      where: { id: evidenceId, is_archived: false } as any,
    });
    if (!batchExisting) throw new NotFoundException("Evidence not found");
    await this.batchEvidenceRepo.update(evidenceId, {
      is_archived: true,
      updated_by: currentUser?.id === -1 ? null : currentUser,
    } as any);
    return { message: "Evidence archived" };
  }

  async getPublicTrackingByToken(token: string) {
    const tracker = await this.trackersRepo.findOne({
      where: { public_tracking_token: token, is_archived: false },
      relations: ["template", "steps", "steps.evidence"],
    });
    if (!tracker) throw new NotFoundException("Tracking not found");

    tracker.steps = (tracker.steps || [])
      .filter((s) => !s.is_archived && s.donor_visible)
      .sort((a, b) => a.step_order - b.step_order)
      .map((s) => ({
        ...s,
        evidence: (s.evidence || []).filter((e) => !e.is_archived),
      })) as any;

    await this.attachBatchEvidenceIfApplicable(tracker as any);
    return tracker;
  }
}
