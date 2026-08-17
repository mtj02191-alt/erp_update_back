import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, Not, In } from "typeorm";
import { Appeal, AppealStatus } from "./entities/appeal.entity";
import { AppealsBenificiary } from "../appeals_benificiaries/entities/appeals_benificiary.entity";
import { Donation } from "../../donations/entities/donation.entity";
import { CreateAppealDto } from "./dto/create-appeal.dto";
import { UpdateAppealDto } from "./dto/update-appeal.dto";
import { AppealFiltersDto } from "./dto/appeal-filters.dto";
import { AppealsBenificiariesService } from "../appeals_benificiaries/appeals_benificiaries.service";
import { AppealMediaService } from "../appeal_media/appeal_media.service";
import { AppealMediaType } from "../appeal_media/entities/appeal_media.entity";
import {
  clampLookupLimit,
  LOOKUP_PROFILES,
  LookupOption,
  selectEntityFields,
  toLookupOptions,
} from "../../utils/lookup";

export type AppealWithStats = Appeal & {
  raised_amount: number;
  donor_count: number;
  progress_percent: number;
  days_left: number | null;
};

@Injectable()
export class AppealsService {
  constructor(
    @InjectRepository(Appeal)
    private readonly appealRepo: Repository<Appeal>,
    @InjectRepository(Donation)
    private readonly donationRepo: Repository<Donation>,
    private readonly beneficiariesService: AppealsBenificiariesService,
    private readonly appealMediaService: AppealMediaService,
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
      const existing = await this.appealRepo.findOne({
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

  private donationAmount(d: Donation): number {
    return Number(d.paid_amount ?? d.amount ?? 0);
  }

  async getDonationStats(appealId: number): Promise<{
    raised_amount: number;
    donor_count: number;
  }> {
    const donations = await this.donationRepo.find({
      where: {
        appeal_id: appealId,
        status: In(["paid", "completed"]),
      },
      select: ["amount", "paid_amount", "donor_id"],
    });

    const raised_amount = donations.reduce(
      (sum, d) => sum + this.donationAmount(d),
      0,
    );
    const donor_count = new Set(
      donations.map((d) => d.donor_id).filter(Boolean),
    ).size;

    return {
      raised_amount: Math.round(raised_amount * 100) / 100,
      donor_count,
    };
  }

  private attachStats(
    appeal: Appeal,
    stats: { raised_amount: number; donor_count: number },
  ): AppealWithStats {
    const goal = Number(appeal.goal_amount ?? 0);
    const progress_percent =
      goal > 0
        ? Math.min(100, Math.round((stats.raised_amount / goal) * 100))
        : 0;

    let days_left: number | null = null;
    if (appeal.end_at) {
      const diff = new Date(appeal.end_at).getTime() - Date.now();
      days_left = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
    }

    return {
      ...appeal,
      ...stats,
      progress_percent,
      days_left,
    };
  }

  async enrichWithStats(appeal: Appeal): Promise<AppealWithStats> {
    const stats = await this.getDonationStats(appeal.id);
    return this.attachStats(appeal, stats);
  }

  async create(dto: CreateAppealDto, createdBy: number | null): Promise<Appeal> {
    this.validateDateRange(
      dto.start_at ? new Date(dto.start_at) : null,
      dto.end_at ? new Date(dto.end_at) : null,
    );

    let slug = dto.slug?.trim() || this.generateSlug(dto.title);
    slug = await this.ensureUniqueSlug(slug);

    let beneficiary_id: number | null = null;
    if (dto.beneficiary?.name) {
      const beneficiary = await this.beneficiariesService.create(dto.beneficiary);
      beneficiary_id = beneficiary.id;
    }

    const appeal = this.appealRepo.create({
      title: dto.title,
      slug,
      short_description: dto.short_description ?? null,
      story: dto.story ?? null,
      status: dto.status ?? AppealStatus.DRAFT,
      category: dto.category,
      tags: dto.tags ?? null,
      goal_amount: dto.goal_amount ?? null,
      currency: dto.currency ?? "PKR",
      start_at: dto.start_at ? new Date(dto.start_at) : null,
      end_at: dto.end_at ? new Date(dto.end_at) : null,
      cover_image_url: dto.cover_image_url ?? null,
      is_featured: dto.is_featured ?? false,
      is_urgent: dto.is_urgent ?? false,
      is_verified: dto.is_verified ?? true,
      donation_protected: dto.donation_protected ?? true,
      organizer_name: dto.organizer_name ?? null,
      organizer_location: dto.organizer_location ?? null,
      organizer_bio: dto.organizer_bio ?? null,
      organizer_image_url: dto.organizer_image_url ?? null,
      organizer_verified: dto.organizer_verified ?? false,
      impact_points: dto.impact_points ?? null,
      beneficiary_id,
      created_by: createdBy != null ? ({ id: createdBy } as any) : undefined,
    });

    const saved = await this.appealRepo.save(appeal);

    const galleryUrls = (dto.gallery_image_urls || []).filter(
      (u) => typeof u === "string" && u.trim().length > 0,
    );
    for (let i = 0; i < galleryUrls.length; i++) {
      await this.appealMediaService.create({
        appeal_id: saved.id,
        url: galleryUrls[i].trim(),
        media_type: AppealMediaType.GALLERY,
        sort_order: i,
      });
    }

    return saved;
  }

  async findAll(filters?: AppealFiltersDto): Promise<AppealWithStats[]> {
    const qb = this.appealRepo
      .createQueryBuilder("a")
      .leftJoinAndSelect("a.beneficiary", "beneficiary")
      .orderBy("a.is_urgent", "DESC")
      .addOrderBy("a.is_featured", "DESC")
      .addOrderBy("a.created_at", "DESC");

    if (!filters?.include_archived) {
      qb.andWhere("a.status != :archived", { archived: AppealStatus.ARCHIVED });
      qb.andWhere("a.is_archived = false");
    }
    if (filters?.status) {
      qb.andWhere("a.status = :status", { status: filters.status });
    }
    if (filters?.category) {
      qb.andWhere("a.category = :category", { category: filters.category });
    }
    if (filters?.is_featured === true) {
      qb.andWhere("a.is_featured = true");
    }
    if (filters?.is_urgent === true) {
      qb.andWhere("a.is_urgent = true");
    }
    if (filters?.search?.trim()) {
      qb.andWhere(
        "(a.title ILIKE :search OR a.short_description ILIKE :search OR a.story ILIKE :search)",
        { search: `%${filters.search.trim()}%` },
      );
    }

    const rows = await qb.getMany();
    return Promise.all(rows.map((row) => this.enrichWithStats(row)));
  }

  async listForOptions(params?: {
    search?: string;
    limit?: number;
  }): Promise<LookupOption[]> {
    const profile = LOOKUP_PROFILES.appeals;
    const take = clampLookupLimit(params?.limit, profile);
    const qb = this.appealRepo
      .createQueryBuilder("a")
      .select(selectEntityFields("a", profile.fields))
      .where("a.status != :archived", { archived: AppealStatus.ARCHIVED })
      .andWhere("a.is_archived = false")
      .orderBy("a.title", "ASC")
      .take(take);

    if (params?.search?.trim()) {
      qb.andWhere("a.title ILIKE :search", {
        search: `%${params.search.trim()}%`,
      });
    }

    const rows = await qb.getMany();
    return toLookupOptions(rows as unknown as Array<Record<string, unknown>>, {
      valueField: profile.valueField,
      labelField: profile.labelField,
      labelFallback: (row) => `Appeal #${row.id}`,
    });
  }

  async findOne(id: number, withRelations = true): Promise<Appeal> {
    const appeal = await this.appealRepo.findOne({
      where: { id },
      relations: withRelations
        ? ["beneficiary", "updates", "media"]
        : undefined,
    });
    if (!appeal) throw new NotFoundException(`Appeal #${id} not found`);
    return appeal;
  }

  async findOneWithStats(id: number): Promise<AppealWithStats> {
    const appeal = await this.findOne(id, true);
    return this.enrichWithStats(appeal);
  }

  async findBySlug(slug: string): Promise<Appeal> {
    const appeal = await this.appealRepo.findOne({
      where: { slug },
      relations: ["beneficiary", "updates", "media"],
    });
    if (!appeal) {
      throw new NotFoundException(`Appeal with slug '${slug}' not found`);
    }
    return appeal;
  }

  async findByIdOrSlug(identifier: string | number): Promise<AppealWithStats> {
    const id = Number(identifier);
    if (!Number.isNaN(id)) {
      return this.findOneWithStats(id);
    }
    const appeal = await this.findBySlug(String(identifier));
    return this.enrichWithStats(appeal);
  }

  async update(
    id: number,
    dto: UpdateAppealDto,
    updatedBy: number | null,
  ): Promise<Appeal> {
    const appeal = await this.findOne(id, true);

    if (dto.start_at !== undefined) {
      appeal.start_at = dto.start_at ? new Date(dto.start_at) : null;
    }
    if (dto.end_at !== undefined) {
      appeal.end_at = dto.end_at ? new Date(dto.end_at) : null;
    }
    this.validateDateRange(appeal.start_at, appeal.end_at);

    if (dto.beneficiary) {
      if (appeal.beneficiary_id) {
        await this.beneficiariesService.update(
          appeal.beneficiary_id,
          dto.beneficiary,
        );
      } else if (dto.beneficiary.name) {
        const beneficiary = await this.beneficiariesService.create(
          dto.beneficiary,
        );
        appeal.beneficiary_id = beneficiary.id;
      }
    }

    if (dto.title !== undefined) appeal.title = dto.title;
    if (dto.short_description !== undefined) {
      appeal.short_description = dto.short_description;
    }
    if (dto.story !== undefined) appeal.story = dto.story;
    if (dto.status !== undefined) appeal.status = dto.status;
    if (dto.category !== undefined) appeal.category = dto.category;
    if (dto.tags !== undefined) appeal.tags = dto.tags;
    if (dto.goal_amount !== undefined) appeal.goal_amount = dto.goal_amount;
    if (dto.currency !== undefined) appeal.currency = dto.currency;
    if (dto.cover_image_url !== undefined) {
      appeal.cover_image_url = dto.cover_image_url;
    }
    if (dto.is_featured !== undefined) appeal.is_featured = dto.is_featured;
    if (dto.is_urgent !== undefined) appeal.is_urgent = dto.is_urgent;
    if (dto.is_verified !== undefined) appeal.is_verified = dto.is_verified;
    if (dto.donation_protected !== undefined) {
      appeal.donation_protected = dto.donation_protected;
    }
    if (dto.organizer_name !== undefined) {
      appeal.organizer_name = dto.organizer_name;
    }
    if (dto.organizer_location !== undefined) {
      appeal.organizer_location = dto.organizer_location;
    }
    if (dto.organizer_bio !== undefined) appeal.organizer_bio = dto.organizer_bio;
    if (dto.organizer_image_url !== undefined) {
      appeal.organizer_image_url = dto.organizer_image_url;
    }
    if (dto.organizer_verified !== undefined) {
      appeal.organizer_verified = dto.organizer_verified;
    }
    if (dto.impact_points !== undefined) {
      appeal.impact_points = dto.impact_points;
    }

    if (dto.slug !== undefined && dto.slug !== appeal.slug) {
      appeal.slug = await this.ensureUniqueSlug(dto.slug, id);
    }

    appeal.updated_by =
      updatedBy != null ? ({ id: updatedBy } as any) : undefined;
    return this.appealRepo.save(appeal);
  }

  async setStatus(
    id: number,
    status: AppealStatus,
    updatedBy: number | null,
  ): Promise<Appeal> {
    const appeal = await this.findOne(id, false);
    appeal.status = status;
    if (status === AppealStatus.ARCHIVED) {
      appeal.is_archived = true;
    }
    appeal.updated_by =
      updatedBy != null ? ({ id: updatedBy } as any) : undefined;
    return this.appealRepo.save(appeal);
  }

  async archive(id: number, updatedBy: number | null): Promise<void> {
    await this.setStatus(id, AppealStatus.ARCHIVED, updatedBy);
  }

  async getPublicActive(): Promise<AppealWithStats[]> {
    const rows = await this.appealRepo.find({
      where: { status: AppealStatus.ACTIVE, is_archived: false },
      relations: ["beneficiary"],
      order: { is_urgent: "DESC", is_featured: "DESC", created_at: "DESC" },
    });
    return Promise.all(rows.map((row) => this.enrichWithStats(row)));
  }

  async getPublicUrgentHeader(limit = 5): Promise<AppealWithStats[]> {
    const rows = await this.appealRepo.find({
      where: {
        status: AppealStatus.ACTIVE,
        is_archived: false,
        is_urgent: true,
      },
      relations: ["beneficiary"],
      order: { created_at: "DESC" },
      take: limit,
    });
    return Promise.all(rows.map((row) => this.enrichWithStats(row)));
  }

  async getPublicFeatured(): Promise<AppealWithStats | null> {
    const row = await this.appealRepo.findOne({
      where: {
        status: AppealStatus.ACTIVE,
        is_archived: false,
        is_featured: true,
      },
      relations: ["beneficiary", "updates", "media"],
      order: { created_at: "DESC" },
    });
    if (!row) return null;
    return this.enrichWithStats(row);
  }

  async getPublicBySlug(slug: string): Promise<AppealWithStats> {
    const appeal = await this.appealRepo.findOne({
      where: { slug, status: AppealStatus.ACTIVE, is_archived: false },
      relations: ["beneficiary", "updates", "media"],
    });
    if (!appeal) {
      throw new NotFoundException(`Appeal with slug '${slug}' not found`);
    }
    const publishedUpdates = (appeal.updates || []).filter(
      (u) => u.is_published && !u.is_archived,
    );
    const activeMedia = (appeal.media || []).filter((m) => !m.is_archived);
    appeal.updates = publishedUpdates;
    appeal.media = activeMedia;
    return this.enrichWithStats(appeal);
  }
}
