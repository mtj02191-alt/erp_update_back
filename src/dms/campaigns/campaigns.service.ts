import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between, Not, In } from "typeorm";
import { Campaign, CampaignStatus } from "./entities/campaign.entity";
import { CampaignDonationItem } from "./entities/campaign-donation-item.entity";
import { Donation } from "../../donations/entities/donation.entity";
import { CreateCampaignDto } from "./dto/create-campaign.dto";
import { UpdateCampaignDto } from "./dto/update-campaign.dto";
import { CampaignFiltersDto } from "./dto/campaign-filters.dto";
import {
  CreateCampaignDonationItemDto,
  UpdateCampaignDonationItemDto,
} from "./dto/campaign-donation-item.dto";
import { CampaignTargetFrequency } from "./utils/campaign-recurring.constants";
import {
  normalizeCommunicationTemplates,
} from "./utils/campaign-communication.constants";
import {
  getPeriodBounds,
} from "./utils/campaign-recurring.util";
import { ProgramEntity } from "../../program/programs/entities/program.entity";
import { ProgramSubprogram } from "../../program/subprograms/entities/subprogram.entity";

type ProgramSummary = { id: number; key: string; label: string };
type SubProgramSummary = {
  id: number;
  key: string;
  label: string;
  program_id: number;
};

export type CampaignWithProgram = Campaign & {
  program?: ProgramSummary | null;
  sub_program?: SubProgramSummary | null;
};

/** Allow new donations to ended campaigns by default */
const ALLOW_DONATIONS_AFTER_ENDED =
  process.env.CAMPAIGN_ALLOW_DONATIONS_AFTER_ENDED !== "false";

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    private campaignRepo: Repository<Campaign>,
    @InjectRepository(CampaignDonationItem)
    private donationItemRepo: Repository<CampaignDonationItem>,
    @InjectRepository(Donation)
    private donationRepo: Repository<Donation>,
    @InjectRepository(ProgramEntity)
    private programRepo: Repository<ProgramEntity>,
    @InjectRepository(ProgramSubprogram)
    private subprogramRepo: Repository<ProgramSubprogram>,
  ) {}

  private toProgramSummary(program: ProgramEntity | null | undefined): ProgramSummary | null {
    if (!program) return null;
    return { id: program.id, key: program.key, label: program.label };
  }

  private toSubProgramSummary(
    subprogram: ProgramSubprogram | null | undefined,
  ): SubProgramSummary | null {
    if (!subprogram) return null;
    return {
      id: subprogram.id,
      key: subprogram.key,
      label: subprogram.label,
      program_id: subprogram.program_id,
    };
  }

  private async resolveProgramFields(input: {
    program_id?: number | null;
    sub_program_id?: number | null;
  }): Promise<{ program_id: number | null; sub_program_id: number | null }> {
    let program_id =
      input.program_id === undefined || input.program_id === null
        ? null
        : Number(input.program_id);
    let sub_program_id =
      input.sub_program_id === undefined || input.sub_program_id === null
        ? null
        : Number(input.sub_program_id);

    if (program_id != null && (!Number.isFinite(program_id) || program_id <= 0)) {
      throw new BadRequestException("Invalid program_id");
    }
    if (
      sub_program_id != null &&
      (!Number.isFinite(sub_program_id) || sub_program_id <= 0)
    ) {
      throw new BadRequestException("Invalid sub_program_id");
    }

    if (sub_program_id != null) {
      const subprogram = await this.subprogramRepo.findOne({
        where: { id: sub_program_id },
      });
      if (!subprogram) {
        throw new NotFoundException(`Subprogram #${sub_program_id} not found`);
      }
      if (program_id != null && Number(program_id) !== Number(subprogram.program_id)) {
        throw new BadRequestException(
          "Selected subprogram does not belong to the selected program",
        );
      }
      program_id = subprogram.program_id;
    } else if (program_id != null) {
      const program = await this.programRepo.findOne({
        where: { id: program_id },
      });
      if (!program) {
        throw new NotFoundException(`Program #${program_id} not found`);
      }
    }

    return { program_id, sub_program_id };
  }

  private async enrichCampaigns(
    campaigns: Campaign[],
  ): Promise<CampaignWithProgram[]> {
    if (!campaigns.length) return [];

    const programIds = [
      ...new Set(
        campaigns
          .map((c) => (c.program_id != null ? Number(c.program_id) : null))
          .filter((id): id is number => id != null && id > 0),
      ),
    ];
    const subProgramIds = [
      ...new Set(
        campaigns
          .map((c) =>
            c.sub_program_id != null ? Number(c.sub_program_id) : null,
          )
          .filter((id): id is number => id != null && id > 0),
      ),
    ];

    const [programs, subprograms] = await Promise.all([
      programIds.length
        ? this.programRepo.find({ where: { id: In(programIds) } })
        : Promise.resolve([]),
      subProgramIds.length
        ? this.subprogramRepo.find({ where: { id: In(subProgramIds) } })
        : Promise.resolve([]),
    ]);

    const programMap = new Map(programs.map((p) => [Number(p.id), p]));
    const subMap = new Map(subprograms.map((s) => [Number(s.id), s]));

    return campaigns.map((campaign) => ({
      ...campaign,
      program: this.toProgramSummary(
        campaign.program_id != null
          ? programMap.get(Number(campaign.program_id))
          : null,
      ),
      sub_program: this.toSubProgramSummary(
        campaign.sub_program_id != null
          ? subMap.get(Number(campaign.sub_program_id))
          : null,
      ),
    }));
  }

  private async enrichCampaign(campaign: Campaign): Promise<CampaignWithProgram> {
    const [enriched] = await this.enrichCampaigns([campaign]);
    return enriched;
  }

  private generateSlug(title: string): string {
    return title
      .toLowerCase()
      .trim()
      .replace(/[^\w\s-]/g, "")
      .replace(/[\s_-]+/g, "-")
      .replace(/^-+|-+$/g, "");
  }

  private async ensureUniqueSlug(
    slug: string,
    excludeId?: number,
  ): Promise<string> {
    let uniqueSlug = slug;
    let counter = 1;

    while (true) {
      const existing = await this.campaignRepo.findOne({
        where: {
          slug: uniqueSlug,
          ...(excludeId ? { id: Not(excludeId) } : {}),
        },
      });

      if (!existing) return uniqueSlug;
      uniqueSlug = `${slug}-${counter}`;
      counter++;
    }
  }

  private validateDateRange(start_at: Date | null, end_at: Date | null): void {
    if (start_at && end_at && start_at > end_at) {
      throw new BadRequestException(
        "start_at must be before or equal to end_at",
      );
    }
  }

  private validateRecurringFields(
    is_recurring?: boolean,
    target_frequency?: CampaignTargetFrequency | null,
    goal_amount?: number | null,
  ): void {
    if (!is_recurring) return;
    if (!target_frequency) {
      throw new BadRequestException(
        "target_frequency is required for recurring campaigns",
      );
    }
    if (goal_amount == null || Number(goal_amount) <= 0) {
      throw new BadRequestException(
        "goal_amount (per-period target) is required for recurring campaigns",
      );
    }
  }

  private normalizeRecurringFields(dto: {
    is_recurring?: boolean;
    target_frequency?: CampaignTargetFrequency | null;
  }) {
    const isRecurring = dto.is_recurring === true;
    return {
      is_recurring: isRecurring,
      target_frequency: isRecurring ? dto.target_frequency ?? null : null,
    };
  }

  private async createDonationItemsBulk(
    campaignId: number,
    items: CreateCampaignDonationItemDto[],
    defaultCurrency: string,
  ): Promise<CampaignDonationItem[]> {
    if (!items.length) return [];

    const validItems = items.filter(
      (dto) => dto?.name?.trim() && dto.unit_price != null,
    );
    if (!validItems.length) return [];

    const entities = validItems.map((dto, index) =>
      this.donationItemRepo.create({
        campaign_id: campaignId,
        name: dto.name.trim(),
        description: dto.description?.trim() || null,
        unit_price: dto.unit_price,
        currency: dto.currency || defaultCurrency || "PKR",
        sort_order: dto.sort_order ?? index,
        is_active: dto.is_active !== false,
      }),
    );

    return this.donationItemRepo.save(entities);
  }

  async create(
    dto: CreateCampaignDto,
    createdBy: number | null,
  ): Promise<Campaign> {
    this.validateDateRange(
      dto.start_at ? new Date(dto.start_at) : null,
      dto.end_at ? new Date(dto.end_at) : null,
    );
    const recurring = this.normalizeRecurringFields(dto);
    this.validateRecurringFields(
      recurring.is_recurring,
      recurring.target_frequency,
      dto.goal_amount ?? null,
    );

    let slug = dto.slug?.trim() || this.generateSlug(dto.title);
    slug = await this.ensureUniqueSlug(slug);
    const programFields = await this.resolveProgramFields({
      program_id: dto.program_id ?? null,
      sub_program_id: dto.sub_program_id ?? null,
    });

    const campaign = this.campaignRepo.create({
      title: dto.title,
      slug,
      description: dto.description ?? null,
      status: dto.status ?? CampaignStatus.DRAFT,
      goal_amount: dto.goal_amount ?? null,
      currency: dto.currency ?? "PKR",
      start_at: dto.start_at ? new Date(dto.start_at) : null,
      end_at: dto.end_at ? new Date(dto.end_at) : null,
      project_id: dto.project_id ?? null,
      program_id: programFields.program_id,
      sub_program_id: programFields.sub_program_id,
      cover_image_url: dto.cover_image_url ?? null,
      is_featured: dto.is_featured ?? false,
      is_recurring: recurring.is_recurring,
      target_frequency: recurring.target_frequency,
      monthly_donor_automation_enabled:
        dto.monthly_donor_automation_enabled === true && recurring.is_recurring,
      use_default_thanks_and_reminders:
        dto.use_default_thanks_and_reminders === true && recurring.is_recurring,
      communication_templates: normalizeCommunicationTemplates(
        dto.communication_templates,
      ),
      created_by: createdBy != null ? ({ id: createdBy } as any) : undefined,
    });

    const saved = await this.campaignRepo.save(campaign);

    if (dto.donation_items?.length) {
      await this.createDonationItemsBulk(
        saved.id,
        dto.donation_items,
        saved.currency,
      );
    }

    return this.enrichCampaign(saved);
  }

  async findAll(filters?: CampaignFiltersDto): Promise<CampaignWithProgram[]> {
    const qb = this.campaignRepo
      .createQueryBuilder("c")
      .orderBy("c.created_at", "DESC");

    if (filters?.status) {
      qb.andWhere("c.status = :status", { status: filters.status });
    }
    if (filters?.project_id != null) {
      qb.andWhere("c.project_id = :projectId", {
        projectId: filters.project_id,
      });
    }
    if (filters?.program_id != null) {
      qb.andWhere("c.program_id = :programId", {
        programId: filters.program_id,
      });
    }
    if (filters?.sub_program_id != null) {
      qb.andWhere("c.sub_program_id = :subProgramId", {
        subProgramId: filters.sub_program_id,
      });
    }
    if (filters?.search?.trim()) {
      qb.andWhere("(c.title ILIKE :search OR c.description ILIKE :search)", {
        search: `%${filters.search.trim()}%`,
      });
    }
    if (filters?.from) {
      qb.andWhere("c.start_at >= :from", { from: filters.from });
    }
    if (filters?.to) {
      qb.andWhere("c.end_at <= :to", { to: filters.to });
    }
    if (filters?.is_recurring != null) {
      qb.andWhere("c.is_recurring = :isRecurring", {
        isRecurring: filters.is_recurring,
      });
    }
    if (filters?.target_frequency) {
      qb.andWhere("c.target_frequency = :targetFrequency", {
        targetFrequency: filters.target_frequency,
      });
    }

    return this.enrichCampaigns(await qb.getMany());
  }

  async findOne(id: number): Promise<CampaignWithProgram> {
    const campaign = await this.campaignRepo.findOne({ where: { id } });
    if (!campaign) throw new NotFoundException(`Campaign #${id} not found`);
    return this.enrichCampaign(campaign);
  }

  async findBySlug(slug: string): Promise<CampaignWithProgram> {
    const campaign = await this.campaignRepo.findOne({ where: { slug } });
    if (!campaign)
      throw new NotFoundException(`Campaign with slug '${slug}' not found`);
    return this.enrichCampaign(campaign);
  }

  async findByIdOrSlug(identifier: string | number): Promise<CampaignWithProgram> {
    const id = Number(identifier);
    if (!Number.isNaN(id)) {
      return this.findOne(id);
    }
    return this.findBySlug(String(identifier));
  }

  async update(
    id: number,
    dto: UpdateCampaignDto,
    updatedBy: number | null,
  ): Promise<CampaignWithProgram> {
    const campaign = await this.campaignRepo.findOne({ where: { id } });
    if (!campaign) throw new NotFoundException(`Campaign #${id} not found`);

    if (dto.start_at !== undefined)
      campaign.start_at = dto.start_at ? new Date(dto.start_at) : null;
    if (dto.end_at !== undefined)
      campaign.end_at = dto.end_at ? new Date(dto.end_at) : null;
    this.validateDateRange(campaign.start_at, campaign.end_at);

    if (dto.title !== undefined) campaign.title = dto.title;
    if (dto.description !== undefined) campaign.description = dto.description;
    if (dto.status !== undefined) campaign.status = dto.status;
    if (dto.goal_amount !== undefined) campaign.goal_amount = dto.goal_amount;
    if (dto.currency !== undefined) campaign.currency = dto.currency;
    if (dto.project_id !== undefined) campaign.project_id = dto.project_id;
    if (dto.program_id !== undefined || dto.sub_program_id !== undefined) {
      const programFields = await this.resolveProgramFields({
        program_id:
          dto.program_id !== undefined ? dto.program_id : campaign.program_id,
        sub_program_id:
          dto.sub_program_id !== undefined
            ? dto.sub_program_id
            : campaign.sub_program_id,
      });
      campaign.program_id = programFields.program_id;
      campaign.sub_program_id = programFields.sub_program_id;
    }
    if (dto.cover_image_url !== undefined)
      campaign.cover_image_url = dto.cover_image_url;
    if (dto.is_featured !== undefined) campaign.is_featured = dto.is_featured;

    const nextRecurring = {
      is_recurring:
        dto.is_recurring !== undefined ? dto.is_recurring : campaign.is_recurring,
      target_frequency:
        dto.target_frequency !== undefined
          ? dto.target_frequency
          : campaign.target_frequency,
    };
    const recurring = this.normalizeRecurringFields(nextRecurring);
    const nextGoal =
      dto.goal_amount !== undefined ? dto.goal_amount : campaign.goal_amount;
    this.validateRecurringFields(
      recurring.is_recurring,
      recurring.target_frequency,
      nextGoal,
    );
    campaign.is_recurring = recurring.is_recurring;
    campaign.target_frequency = recurring.target_frequency;

    if (dto.monthly_donor_automation_enabled !== undefined) {
      campaign.monthly_donor_automation_enabled =
        dto.monthly_donor_automation_enabled === true && campaign.is_recurring;
    } else if (!campaign.is_recurring) {
      campaign.monthly_donor_automation_enabled = false;
    }

    if (dto.use_default_thanks_and_reminders !== undefined) {
      campaign.use_default_thanks_and_reminders =
        dto.use_default_thanks_and_reminders === true && campaign.is_recurring;
    } else if (!campaign.is_recurring) {
      campaign.use_default_thanks_and_reminders = false;
    }

    if (dto.communication_templates !== undefined) {
      campaign.communication_templates = normalizeCommunicationTemplates(
        dto.communication_templates,
      );
    }

    if (dto.slug !== undefined && dto.slug !== campaign.slug) {
      campaign.slug = await this.ensureUniqueSlug(dto.slug, id);
    }

    campaign.updated_by =
      updatedBy != null ? ({ id: updatedBy } as any) : undefined;
    const saved = await this.campaignRepo.save(campaign);
    return this.enrichCampaign(saved);
  }

  async setStatus(
    id: number,
    status: CampaignStatus,
    updatedBy: number | null,
  ): Promise<CampaignWithProgram> {
    const campaign = await this.campaignRepo.findOne({ where: { id } });
    if (!campaign) throw new NotFoundException(`Campaign #${id} not found`);
    campaign.status = status;
    campaign.updated_by =
      updatedBy != null ? ({ id: updatedBy } as any) : undefined;
    const saved = await this.campaignRepo.save(campaign);
    return this.enrichCampaign(saved);
  }

  async remove(id: number): Promise<void> {
    const campaign = await this.campaignRepo.findOne({ where: { id } });
    if (!campaign) throw new NotFoundException(`Campaign #${id} not found`);
    campaign.status = CampaignStatus.ARCHIVED;
    campaign.is_archived = true;
    await this.campaignRepo.save(campaign);
  }

  async getActiveFeatured(): Promise<Campaign[]> {
    return this.campaignRepo.find({
      where: { status: CampaignStatus.ACTIVE, is_featured: true },
      order: { created_at: "DESC" },
    });
  }

  async getPublicActive(): Promise<CampaignWithProgram[]> {
    const campaigns = await this.campaignRepo.find({
      where: { status: CampaignStatus.ACTIVE },
      order: { is_featured: "DESC", created_at: "DESC" },
    });
    return this.enrichCampaigns(campaigns);
  }

  async getPublicBySlug(slug: string): Promise<CampaignWithProgram> {
    const campaign = await this.campaignRepo.findOne({
      where: { slug, status: CampaignStatus.ACTIVE },
    });
    if (!campaign)
      throw new NotFoundException(`Campaign with slug '${slug}' not found`);
    return this.enrichCampaign(campaign);
  }

  async getPublicByIdOrSlug(identifier: string): Promise<CampaignWithProgram> {
    const id = Number(identifier);
    const campaign = !Number.isNaN(id)
      ? await this.campaignRepo.findOne({
          where: { id, status: CampaignStatus.ACTIVE },
        })
      : await this.campaignRepo.findOne({
          where: { slug: identifier, status: CampaignStatus.ACTIVE },
        });
    if (!campaign) {
      throw new NotFoundException(`Campaign '${identifier}' not found`);
    }
    return this.enrichCampaign(campaign);
  }

  async getPublicCampaignWithItems(identifier: string): Promise<
    CampaignWithProgram & { donation_items: CampaignDonationItem[] }
  > {
    const campaign = await this.getPublicByIdOrSlug(identifier);
    const donation_items = await this.listDonationItems(campaign.id, true);
    return { ...campaign, donation_items };
  }

  async getPublicDonationItems(
    identifier: string,
  ): Promise<CampaignDonationItem[]> {
    const campaign = await this.getPublicByIdOrSlug(identifier);
    return this.listDonationItems(campaign.id, true);
  }

  /** Returns true if campaign can accept donations (for donation form / API) */
  canAcceptDonation(campaign: Campaign, isAdmin: boolean): boolean {
    if (isAdmin) return campaign.status !== CampaignStatus.ARCHIVED;
    if (campaign.status === CampaignStatus.ACTIVE) return true;
    if (campaign.status === CampaignStatus.ENDED && ALLOW_DONATIONS_AFTER_ENDED)
      return true;
    return false;
  }

  async getReport(
    id: number,
    from?: string,
    to?: string,
  ): Promise<{
    total_amount: number;
    total_donations: number;
    unique_donors: number;
    avg_donation: number;
    daily_totals: { date: string; amount: number; count: number }[];
    is_recurring: boolean;
    target_frequency: string | null;
    period_goal: number | null;
    current_period?: {
      label: string;
      start: string;
      end: string;
      raised: number;
      count: number;
      progress_pct: number | null;
    };
    period_totals?: {
      period_key: string;
      label: string;
      start: string;
      end: string;
      amount: number;
      count: number;
      goal: number | null;
      progress_pct: number | null;
    }[];
  }> {
    const campaign = await this.findOne(id);

    const fromDate = from ? new Date(from) : new Date(0);
    const toDate = to ? new Date(to) : new Date();

    const donations = await this.donationRepo.find({
      where: {
        campaign_id: id,
        status: In(["paid", "completed"]),
        date: Between(fromDate, toDate),
      },
      select: ["amount", "paid_amount", "donor_id", "date"],
    });

    const amountField = (d: Donation) => Number(d.paid_amount ?? d.amount ?? 0);
    const totalAmount = donations.reduce((sum, d) => sum + amountField(d), 0);
    const totalDonations = donations.length;
    const uniqueDonors = new Set(
      donations.map((d) => d.donor_id).filter(Boolean),
    ).size;
    const avgDonation = totalDonations > 0 ? totalAmount / totalDonations : 0;

    const byDate = new Map<string, { amount: number; count: number }>();
    for (const d of donations) {
      const dateStr = d.date
        ? new Date(d.date).toISOString().split("T")[0]
        : "unknown";
      const existing = byDate.get(dateStr) || { amount: 0, count: 0 };
      existing.amount += amountField(d);
      existing.count += 1;
      byDate.set(dateStr, existing);
    }

    const dailyTotals = Array.from(byDate.entries())
      .map(([date, { amount, count }]) => ({ date, amount, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    const baseReport = {
      total_amount: Math.round(totalAmount * 100) / 100,
      total_donations: totalDonations,
      unique_donors: uniqueDonors,
      avg_donation: Math.round(avgDonation * 100) / 100,
      daily_totals: dailyTotals.map((dt) => ({
        ...dt,
        amount: Math.round(dt.amount * 100) / 100,
      })),
      is_recurring: campaign.is_recurring,
      target_frequency: campaign.target_frequency,
      period_goal:
        campaign.is_recurring && campaign.goal_amount != null
          ? Number(campaign.goal_amount)
          : null,
    };

    if (
      !campaign.is_recurring ||
      !campaign.target_frequency ||
      campaign.goal_amount == null
    ) {
      return baseReport;
    }

    const frequency = campaign.target_frequency as CampaignTargetFrequency;
    const periodGoal = Number(campaign.goal_amount);
    const periodMap = new Map<
      string,
      {
        label: string;
        start: Date;
        end: Date;
        amount: number;
        count: number;
      }
    >();

    for (const d of donations) {
      const donationDate = d.date ? new Date(d.date) : null;
      if (!donationDate || Number.isNaN(donationDate.getTime())) continue;
      const bounds = getPeriodBounds(donationDate, frequency);
      const existing = periodMap.get(bounds.key) || {
        label: bounds.label,
        start: bounds.start,
        end: bounds.end,
        amount: 0,
        count: 0,
      };
      existing.amount += amountField(d);
      existing.count += 1;
      periodMap.set(bounds.key, existing);
    }

    const periodTotals = Array.from(periodMap.entries())
      .map(([period_key, row]) => ({
        period_key,
        label: row.label,
        start: row.start.toISOString(),
        end: row.end.toISOString(),
        amount: Math.round(row.amount * 100) / 100,
        count: row.count,
        goal: periodGoal,
        progress_pct:
          periodGoal > 0
            ? Math.round((row.amount / periodGoal) * 10000) / 100
            : null,
      }))
      .sort((a, b) => a.start.localeCompare(b.start));

    const currentBounds = getPeriodBounds(new Date(), frequency);
    const currentDonations = donations.filter((d) => {
      if (!d.date) return false;
      const dt = new Date(d.date);
      return dt >= currentBounds.start && dt <= currentBounds.end;
    });
    const currentRaised = currentDonations.reduce(
      (sum, d) => sum + amountField(d),
      0,
    );

    return {
      ...baseReport,
      current_period: {
        label: currentBounds.label,
        start: currentBounds.start.toISOString(),
        end: currentBounds.end.toISOString(),
        raised: Math.round(currentRaised * 100) / 100,
        count: currentDonations.length,
        progress_pct:
          periodGoal > 0
            ? Math.round((currentRaised / periodGoal) * 10000) / 100
            : null,
      },
      period_totals: periodTotals,
    };
  }

  async listDonationItems(
    campaignId: number,
    activeOnly = false,
  ): Promise<CampaignDonationItem[]> {
    await this.findOne(campaignId);
    const qb = this.donationItemRepo
      .createQueryBuilder("item")
      .where("item.campaign_id = :campaignId", { campaignId })
      .andWhere("item.is_archived = false")
      .orderBy("item.sort_order", "ASC")
      .addOrderBy("item.id", "ASC");
    if (activeOnly) {
      qb.andWhere("item.is_active = true");
    }
    return qb.getMany();
  }

  async createDonationItem(
    campaignId: number,
    dto: CreateCampaignDonationItemDto,
  ): Promise<CampaignDonationItem> {
    const campaign = await this.findOne(campaignId);
    const item = this.donationItemRepo.create({
      campaign_id: campaign.id,
      name: dto.name.trim(),
      description: dto.description?.trim() || null,
      unit_price: dto.unit_price,
      currency: dto.currency || campaign.currency || "PKR",
      sort_order: dto.sort_order ?? 0,
      is_active: dto.is_active !== false,
    });
    return this.donationItemRepo.save(item);
  }

  async updateDonationItem(
    campaignId: number,
    itemId: number,
    dto: UpdateCampaignDonationItemDto,
  ): Promise<CampaignDonationItem> {
    await this.findOne(campaignId);
    const item = await this.donationItemRepo.findOne({
      where: { id: itemId, campaign_id: campaignId, is_archived: false },
    });
    if (!item) {
      throw new NotFoundException(
        `Donation item #${itemId} not found on campaign #${campaignId}`,
      );
    }
    if (dto.name !== undefined) item.name = dto.name.trim();
    if (dto.description !== undefined) {
      item.description = dto.description?.trim() || null;
    }
    if (dto.unit_price !== undefined) item.unit_price = dto.unit_price;
    if (dto.currency !== undefined) item.currency = dto.currency;
    if (dto.sort_order !== undefined) item.sort_order = dto.sort_order;
    if (dto.is_active !== undefined) item.is_active = dto.is_active;
    return this.donationItemRepo.save(item);
  }

  async removeDonationItem(campaignId: number, itemId: number): Promise<void> {
    await this.findOne(campaignId);
    const item = await this.donationItemRepo.findOne({
      where: { id: itemId, campaign_id: campaignId, is_archived: false },
    });
    if (!item) {
      throw new NotFoundException(
        `Donation item #${itemId} not found on campaign #${campaignId}`,
      );
    }
    item.is_archived = true;
    item.is_active = false;
    await this.donationItemRepo.save(item);
  }
}
