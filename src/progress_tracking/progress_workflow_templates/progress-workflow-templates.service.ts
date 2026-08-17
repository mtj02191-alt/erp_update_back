import {
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ProgressWorkflowTemplate } from "./progress_workflow_template.entity";
import { ProgressWorkflowTemplateStep } from "./progress_workflow_template_step.entity";
import { CreateWorkflowTemplateDto } from "./dto/create-workflow-template.dto";
import { UpdateWorkflowTemplateDto } from "./dto/update-workflow-template.dto";
import { CreateTemplateStepDto } from "./dto/create-template-step.dto";
import { ReorderTemplateStepsDto } from "./dto/reorder-template-steps.dto";
import {
  clampLookupLimit,
  LOOKUP_PROFILES,
  LookupOption,
  selectEntityFields,
  toLookupOptions,
} from "../../utils/lookup";

@Injectable()
export class ProgressWorkflowTemplatesService {
  constructor(
    @InjectRepository(ProgressWorkflowTemplate)
    private readonly templatesRepo: Repository<ProgressWorkflowTemplate>,
    @InjectRepository(ProgressWorkflowTemplateStep)
    private readonly stepsRepo: Repository<ProgressWorkflowTemplateStep>,
  ) {}

  async ensureSeedTemplates(): Promise<void> {
    const code = "qurbani_workflow";
    const existing = await this.templatesRepo.findOne({ where: { code } });
    if (existing) return;

    const template = await this.templatesRepo.save(
      this.templatesRepo.create({
        name: "Qurbani Workflow",
        code,
        description:
          "Demo workflow template seed for Qurbani progress tracking.",
        is_active: true,
      }),
    );

    const steps: Array<Partial<ProgressWorkflowTemplateStep>> = [
      {
        step_key: "booked",
        title: "Qurbani Booked",
        step_order: 1,
        allow_notes: true,
        allow_evidence: true,
        allow_metadata: false,
        notify_donor_on_complete: true,
        is_required: true,
      },
      {
        step_key: "animal_purchased",
        title: "Animal Purchased",
        step_order: 2,
        allow_notes: true,
        allow_evidence: true,
        allow_metadata: false,
        notify_donor_on_complete: true,
        is_required: true,
      },
      {
        step_key: "tag_assigned",
        title: "Animal Tag Assigned",
        step_order: 3,
        allow_notes: true,
        allow_evidence: true,
        allow_metadata: true,
        metadata_schema: {
          type: "object",
          properties: {
            tag_number: { type: "string" },
            animal_type: { type: "string" },
            location: { type: "string" },
          },
          required: ["tag_number"],
        },
        notify_donor_on_complete: true,
        is_required: true,
      },
      {
        step_key: "slaughter_completed",
        title: "Animal Slaughtered",
        step_order: 4,
        allow_notes: true,
        allow_evidence: true,
        allow_metadata: false,
        notify_donor_on_complete: true,
        is_required: true,
      },
      {
        step_key: "meat_distributed",
        title: "Meat Distributed",
        step_order: 5,
        allow_notes: true,
        allow_evidence: true,
        allow_metadata: false,
        notify_donor_on_complete: true,
        is_required: true,
      },
    ];

    await this.stepsRepo.save(
      steps.map((s) =>
        this.stepsRepo.create({
          template_id: template.id,
          ...s,
        }),
      ),
    );
  }

  async create(dto: CreateWorkflowTemplateDto, currentUser?: any) {
    const existingCode = await this.templatesRepo.findOne({
      where: { code: dto.code },
    });
    if (existingCode)
      throw new ConflictException("Template code already exists");

    const template = this.templatesRepo.create({
      ...dto,
      created_by: currentUser?.id === -1 ? null : currentUser,
      updated_by: currentUser?.id === -1 ? null : currentUser,
    } as any);
    return this.templatesRepo.save(template);
  }

  async findAll() {
    return this.templatesRepo.find({
      where: { is_archived: false },
      order: { created_at: "DESC" },
    });
  }

  async listForOptions(params?: {
    search?: string;
    limit?: number;
    activeOnly?: boolean;
  }): Promise<LookupOption[]> {
    const profile = LOOKUP_PROFILES.workflow_templates;
    const take = clampLookupLimit(params?.limit, profile);
    const qb = this.templatesRepo
      .createQueryBuilder("t")
      .select(selectEntityFields("t", profile.fields))
      .where("t.is_archived = false")
      .orderBy("t.name", "ASC")
      .take(take);

    if (params?.activeOnly !== false) {
      qb.andWhere("t.is_active = true");
    }
    if (params?.search?.trim()) {
      qb.andWhere("(t.name ILIKE :search OR t.code ILIKE :search)", {
        search: `%${params.search.trim()}%`,
      });
    }

    const rows = await qb.getMany();
    return toLookupOptions(rows as unknown as Array<Record<string, unknown>>, {
      valueField: profile.valueField,
      labelField: profile.labelField,
      labelFallback: (row) =>
        row.code ? String(row.code) : `Template #${row.id}`,
    });
  }

  async findOne(id: number) {
    const template = await this.templatesRepo.findOne({
      where: { id, is_archived: false },
      relations: ["steps"],
    });
    if (!template) throw new NotFoundException("Template not found");
    template.steps = (template.steps || [])
      .filter((s) => !s.is_archived)
      .sort((a, b) => a.step_order - b.step_order);
    return template;
  }

  async update(id: number, dto: UpdateWorkflowTemplateDto, currentUser?: any) {
    const template = await this.templatesRepo.findOne({
      where: { id, is_archived: false },
    });
    if (!template) throw new NotFoundException("Template not found");

    if (dto.code && dto.code !== template.code) {
      const existing = await this.templatesRepo.findOne({
        where: { code: dto.code },
      });
      if (existing) throw new ConflictException("Template code already exists");
    }

    await this.templatesRepo.update(id, {
      ...dto,
      updated_by: currentUser?.id === -1 ? null : currentUser,
    } as any);
    return this.findOne(id);
  }

  async archive(id: number, currentUser?: any) {
    const template = await this.templatesRepo.findOne({
      where: { id, is_archived: false },
    });
    if (!template) throw new NotFoundException("Template not found");
    await this.templatesRepo.update(id, {
      is_archived: true,
      updated_by: currentUser?.id === -1 ? null : currentUser,
    } as any);
    return { message: "Template archived" };
  }

  async addStep(
    templateId: number,
    dto: CreateTemplateStepDto,
    currentUser?: any,
  ) {
    const template = await this.templatesRepo.findOne({
      where: { id: templateId, is_archived: false },
    });
    if (!template) throw new NotFoundException("Template not found");

    const existing = await this.stepsRepo.findOne({
      where: { template_id: templateId, step_key: dto.step_key },
    });
    if (existing && !existing.is_archived)
      throw new ConflictException("Step key already exists for this template");

    const step = this.stepsRepo.create({
      template_id: templateId,
      ...dto,
      created_by: currentUser?.id === -1 ? null : currentUser,
      updated_by: currentUser?.id === -1 ? null : currentUser,
    } as any);
    return this.stepsRepo.save(step);
  }

  async updateStep(
    stepId: number,
    dto: Partial<CreateTemplateStepDto>,
    currentUser?: any,
  ) {
    const step = await this.stepsRepo.findOne({
      where: { id: stepId, is_archived: false },
    });
    if (!step) throw new NotFoundException("Template step not found");

    if (dto.step_key && dto.step_key !== step.step_key) {
      const existing = await this.stepsRepo.findOne({
        where: { template_id: step.template_id, step_key: dto.step_key },
      });
      if (existing && !existing.is_archived)
        throw new ConflictException(
          "Step key already exists for this template",
        );
    }

    await this.stepsRepo.update(stepId, {
      ...dto,
      updated_by: currentUser?.id === -1 ? null : currentUser,
    } as any);
    return this.stepsRepo.findOne({ where: { id: stepId } });
  }

  async archiveStep(stepId: number, currentUser?: any) {
    const step = await this.stepsRepo.findOne({
      where: { id: stepId, is_archived: false },
    });
    if (!step) throw new NotFoundException("Template step not found");
    await this.stepsRepo.update(stepId, {
      is_archived: true,
      updated_by: currentUser?.id === -1 ? null : currentUser,
    } as any);
    return { message: "Template step archived" };
  }

  async reorderSteps(
    templateId: number,
    dto: ReorderTemplateStepsDto,
    currentUser?: any,
  ) {
    const template = await this.templatesRepo.findOne({
      where: { id: templateId, is_archived: false },
    });
    if (!template) throw new NotFoundException("Template not found");

    const steps = await this.stepsRepo.findBy({ template_id: templateId });
    const activeSteps = steps.filter((s) => !s.is_archived);
    const activeIds = new Set(activeSteps.map((s) => s.id));
    const incomingIds = dto.step_ids || [];
    if (
      incomingIds.length !== activeSteps.length ||
      incomingIds.some((id) => !activeIds.has(id))
    ) {
      throw new ConflictException(
        "step_ids must include all active step ids exactly once",
      );
    }

    for (let i = 0; i < incomingIds.length; i++) {
      await this.stepsRepo.update(incomingIds[i], {
        step_order: i + 1,
        updated_by: currentUser?.id === -1 ? null : currentUser,
      } as any);
    }
    return this.findOne(templateId);
  }
}
