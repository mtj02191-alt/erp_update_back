import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Between, Not, In } from "typeorm";
import { Campaign, CampaignStatus } from "./entities/campaign.entity";
import { Donation } from "../../donations/entities/donation.entity";
import { CreateCampaignDto } from "./dto/create-campaign.dto";
import { UpdateCampaignDto } from "./dto/update-campaign.dto";
import { CampaignFiltersDto } from "./dto/campaign-filters.dto";

/** Allow new donations to ended campaigns by default */
const ALLOW_DONATIONS_AFTER_ENDED =
  process.env.CAMPAIGN_ALLOW_DONATIONS_AFTER_ENDED !== "false";

@Injectable()
export class CampaignsService {
  constructor(
    @InjectRepository(Campaign)
    private campaignRepo: Repository<Campaign>,
    @InjectRepository(Donation)
    private donationRepo: Repository<Donation>,
  ) {}

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

  async create(
    dto: CreateCampaignDto,
    createdBy: number | null,
  ): Promise<Campaign> {
    this.validateDateRange(
      dto.start_at ? new Date(dto.start_at) : null,
      dto.end_at ? new Date(dto.end_at) : null,
    );

    let slug = dto.slug?.trim() || this.generateSlug(dto.title);
    slug = await this.ensureUniqueSlug(slug);

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
      cover_image_url: dto.cover_image_url ?? null,
      is_featured: dto.is_featured ?? false,
      created_by: createdBy != null ? ({ id: createdBy } as any) : undefined,
    });

    return this.campaignRepo.save(campaign);
  }

  async findAll(filters?: CampaignFiltersDto): Promise<Campaign[]> {
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

    return qb.getMany();
  }

  async findOne(id: number): Promise<Campaign> {
    const campaign = await this.campaignRepo.findOne({ where: { id } });
    if (!campaign) throw new NotFoundException(`Campaign #${id} not found`);
    return campaign;
  }

  async findBySlug(slug: string): Promise<Campaign> {
    const campaign = await this.campaignRepo.findOne({ where: { slug } });
    if (!campaign)
      throw new NotFoundException(`Campaign with slug '${slug}' not found`);
    return campaign;
  }

  async findByIdOrSlug(identifier: string | number): Promise<Campaign> {
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
  ): Promise<Campaign> {
    const campaign = await this.findOne(id);

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
    if (dto.cover_image_url !== undefined)
      campaign.cover_image_url = dto.cover_image_url;
    if (dto.is_featured !== undefined) campaign.is_featured = dto.is_featured;

    if (dto.slug !== undefined && dto.slug !== campaign.slug) {
      campaign.slug = await this.ensureUniqueSlug(dto.slug, id);
    }

    campaign.updated_by =
      updatedBy != null ? ({ id: updatedBy } as any) : undefined;
    return this.campaignRepo.save(campaign);
  }

  async setStatus(
    id: number,
    status: CampaignStatus,
    updatedBy: number | null,
  ): Promise<Campaign> {
    const campaign = await this.findOne(id);
    campaign.status = status;
    campaign.updated_by =
      updatedBy != null ? ({ id: updatedBy } as any) : undefined;
    return this.campaignRepo.save(campaign);
  }

  async remove(id: number): Promise<void> {
    const campaign = await this.findOne(id);
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

  async getPublicActive(): Promise<Campaign[]> {
    return this.campaignRepo.find({
      where: { status: CampaignStatus.ACTIVE },
      order: { is_featured: "DESC", created_at: "DESC" },
    });
  }

  async getPublicBySlug(slug: string): Promise<Campaign> {
    const campaign = await this.campaignRepo.findOne({
      where: { slug, status: CampaignStatus.ACTIVE },
    });
    if (!campaign)
      throw new NotFoundException(`Campaign with slug '${slug}' not found`);
    return campaign;
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
  }> {
    await this.findOne(id);

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

    return {
      total_amount: Math.round(totalAmount * 100) / 100,
      total_donations: totalDonations,
      unique_donors: uniqueDonors,
      avg_donation: Math.round(avgDonation * 100) / 100,
      daily_totals: dailyTotals.map((dt) => ({
        ...dt,
        amount: Math.round(dt.amount * 100) / 100,
      })),
    };
  }
}
