import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { WebsiteDonationProject } from "./entities/website-donation-project.entity";
import { WebsiteDonationInitiative } from "./entities/website-donation-initiative.entity";
import { CreateWebsiteDonationProjectDto } from "./dto/create-website-donation-project.dto";
import { UpdateWebsiteDonationProjectDto } from "./dto/update-website-donation-project.dto";
import { WEBSITE_DONATION_CATALOG_SEED } from "./website-donation-catalog.seed";

@Injectable()
export class WebsiteDonationProjectsService {
  constructor(
    @InjectRepository(WebsiteDonationProject)
    private readonly projectRepo: Repository<WebsiteDonationProject>,
    @InjectRepository(WebsiteDonationInitiative)
    private readonly initiativeRepo: Repository<WebsiteDonationInitiative>,
  ) {}

  async seedIfEmpty(): Promise<void> {
    const count = await this.projectRepo.count({
      where: { is_archived: false },
    });
    if (count > 0) return;

    for (const row of WEBSITE_DONATION_CATALOG_SEED) {
      const project = this.projectRepo.create({
        slug: row.slug,
        title: row.title,
        category: row.category,
        icon_key: row.icon_key,
        price: row.price,
        is_new: row.is_new,
        is_default: false,
        sort_order: row.sort_order,
        is_active: true,
      });
      const saved = await this.projectRepo.save(project);
      if (!row.initiatives?.length) continue;
      await this.initiativeRepo.save(
        this.initiativeRepo.create(
          row.initiatives.map((init) => ({
            slug: init.slug,
            title: init.title,
            subtitle: init.subtitle ?? null,
            price: init.price ?? 0,
            description: init.description ?? null,
            duration: init.duration ?? null,
            icon_key: init.icon_key ?? saved.icon_key,
            sort_order: init.sort_order ?? 0,
            project_id: saved.id,
            is_active: true,
          })),
        ),
      );
    }
  }

  toPublicCard(project: WebsiteDonationProject) {
    const initiatives = (project.initiatives || [])
      .filter((i) => !i.is_archived && i.is_active !== false)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0))
      .map((i) => ({
        id: i.slug,
        title: i.title,
        subtitle: i.subtitle,
        price: Number(i.price) || 0,
        description: i.description,
        duration: i.duration,
        icon_key: i.icon_key || project.icon_key,
        templateCode: i.template_code || null,
      }));

    return {
      id: project.slug,
      title: project.title,
      category: project.category,
      icon_key: project.icon_key,
      listingImage: project.listing_image_url || "",
      price: project.price == null ? null : Number(project.price),
      new: !!project.is_new,
      is_default: !!project.is_default,
      templateCode: project.template_code || null,
      initiatives,
    };
  }

  async findPublicCatalog() {
    await this.seedIfEmpty();
    const projects = await this.projectRepo.find({
      where: { is_archived: false, is_active: true },
      relations: ["initiatives"],
      order: { sort_order: "ASC", id: "ASC" },
    });
    return projects.map((p) => this.toPublicCard(p));
  }

  toPublicPageDetail(project: WebsiteDonationProject) {
    const page = (project.page_content || {}) as Record<string, any>;
    if (!page.is_published) return null;

    const content = page.content || {};
    const subProjects = (page.sub_projects || []).map((sp: Record<string, any>) => ({
      id: sp.id || sp.slug || "",
      title: sp.title || "",
      subtitle: sp.subtitle || "",
      description: sp.description || "",
      description2: sp.description2 || "",
      description3: sp.description3 || "",
      impact: sp.impact || "",
      programs: Array.isArray(sp.programs) ? sp.programs : [],
      image: sp.image_url || sp.image || "",
      imageMob: sp.image_mob_url || sp.imageMob || "",
      video: sp.video_url || sp.video || "",
      donateButtonText: sp.donate_button_text || sp.donateButtonText || "",
      donationUrl: sp.donation_url || sp.donationUrl || "",
      bottomText: sp.bottom_text || sp.bottomText || "",
      quranAyat: (() => {
        const ayat = sp.quran_ayat || sp.quranAyat || null;
        const text = ayat?.text?.trim?.() || ayat?.text || "";
        const reference = ayat?.reference?.trim?.() || ayat?.reference || "";
        return text || reference ? { text, reference } : null;
      })(),
    }));

    const faqsBlock = page.faqs || {};
    const faqItems = faqsBlock.items || faqsBlock.faqs || [];
    const testimonialsBlock = page.testimonials || {};

    return {
      id: project.slug,
      title: page.page_title || project.title,
      headerImage: page.header_image_url || page.headerImage || "",
      headerImageMob: page.header_image_mob_url || page.headerImageMob || "",
      mainImage: page.main_image_url || page.mainImage || "",
      donateCategory: page.donate_category || project.category,
      donateButtonText: page.donate_button_text || "",
      initiatives: this.toPublicCard(project).initiatives,
      showInitiative: (project.initiatives || []).some(
        (i) => !i.is_archived && i.is_active !== false,
      ),
      content: {
        subtitle: content.subtitle || "",
        paragraph1: content.paragraph1 || "",
        paragraph2: content.paragraph2 || "",
        paragraph3: content.paragraph3 || "",
        quranAyat: content.quran_ayat || content.quranAyat || null,
        hadith: content.hadith || null,
        testimonials: content.testimonials || null,
      },
      subProjects,
      faqs:
        faqItems.length > 0
          ? {
              title: faqsBlock.title || "",
              subtitle: faqsBlock.subtitle || "",
              faqs: faqItems.map((f: Record<string, any>) => ({
                question: f.question || "",
                answer: f.answer || "",
              })),
            }
          : null,
      testimonials:
        testimonialsBlock.videos?.length
          ? {
              title: testimonialsBlock.title || "",
              subtitle: testimonialsBlock.subtitle || "",
              mobileOnly: !!testimonialsBlock.mobile_only,
              videos: testimonialsBlock.videos || [],
            }
          : null,
    };
  }

  async findPublicPageBySlug(slug: string) {
    await this.seedIfEmpty();
    const normalized = this.normalizeSlug(slug);
    const project = await this.projectRepo.findOne({
      where: { slug: normalized, is_archived: false, is_active: true },
      relations: ["initiatives"],
    });
    if (!project?.page_content) {
      throw new NotFoundException(`Project page "${slug}" not found`);
    }
    const detail = this.toPublicPageDetail(project);
    if (!detail) {
      throw new NotFoundException(`Project page "${slug}" is not published`);
    }
    return detail;
  }

  async findAll(params: {
    page?: number;
    pageSize?: number;
    search?: string;
  }) {
    await this.seedIfEmpty();
    const page = Number(params.page) || 1;
    const pageSize = Number(params.pageSize) || 50;
    const qb = this.projectRepo
      .createQueryBuilder("project")
      .where("project.is_archived = false");

    if (params.search) {
      qb.andWhere(
        "(project.title ILIKE :search OR project.slug ILIKE :search)",
        { search: `%${params.search}%` },
      );
    }

    const total = await qb.getCount();
    const items = await qb
      .leftJoinAndSelect("project.initiatives", "initiative")
      .orderBy("project.sort_order", "ASC")
      .addOrderBy("project.id", "ASC")
      .addOrderBy("initiative.sort_order", "ASC")
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getMany();

    return {
      data: items,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize) || 1,
      },
    };
  }

  async findOne(id: number) {
    const project = await this.projectRepo.findOne({
      where: { id, is_archived: false },
      relations: ["initiatives"],
    });
    if (!project) {
      throw new NotFoundException(`Website donation project ${id} not found`);
    }
    project.initiatives = (project.initiatives || [])
      .filter((i) => !i.is_archived)
      .sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0));
    return project;
  }

  private normalizeSlug(slug: string) {
    return String(slug || "")
      .trim()
      .toLowerCase()
      .replace(/\s+/g, "-");
  }

  private async assertUniqueSlug(slug: string, excludeId?: number) {
    const existing = await this.projectRepo.findOne({
      where: { slug, is_archived: false },
    });
    if (existing && existing.id !== excludeId) {
      throw new BadRequestException(`Project slug "${slug}" is already in use`);
    }
  }

  private async clearOtherDefaults(keepId?: number) {
    const qb = this.projectRepo
      .createQueryBuilder()
      .update(WebsiteDonationProject)
      .set({ is_default: false })
      .where("is_default = true");
    if (keepId) qb.andWhere("id != :keepId", { keepId });
    await qb.execute();
  }

  async create(dto: CreateWebsiteDonationProjectDto) {
    const slug = this.normalizeSlug(dto.slug);
    if (!slug) throw new BadRequestException("Slug is required");
    await this.assertUniqueSlug(slug);
    if (dto.is_default) await this.clearOtherDefaults();

    const project = this.projectRepo.create({
      slug,
      title: dto.title.trim(),
      category: dto.category || "General",
      icon_key: dto.icon_key || null,
      price: dto.price ?? null,
      is_new: !!dto.is_new,
      is_default: !!dto.is_default,
      template_code: dto.template_code || null,
      sort_order: dto.sort_order ?? 0,
      is_active: dto.is_active !== false,
      listing_image_url: dto.listing_image_url?.trim() || null,
      page_content: dto.page_content ?? null,
    });
    const saved = await this.projectRepo.save(project);
    await this.replaceInitiatives(saved.id, dto.initiatives || []);
    return this.findOne(saved.id);
  }

  async update(id: number, dto: UpdateWebsiteDonationProjectDto) {
    const project = await this.findOne(id);
    const slug =
      dto.slug != null ? this.normalizeSlug(dto.slug) : project.slug;
    if (!slug) throw new BadRequestException("Slug is required");
    await this.assertUniqueSlug(slug, id);
    if (dto.is_default) await this.clearOtherDefaults(id);

    await this.projectRepo.update(id, {
      slug,
      title: dto.title != null ? dto.title.trim() : project.title,
      category: dto.category ?? project.category,
      icon_key: dto.icon_key !== undefined ? dto.icon_key : project.icon_key,
      price: dto.price !== undefined ? dto.price : project.price,
      is_new: dto.is_new != null ? dto.is_new : project.is_new,
      is_default: dto.is_default != null ? dto.is_default : project.is_default,
      template_code:
        dto.template_code !== undefined
          ? dto.template_code
          : project.template_code,
      sort_order: dto.sort_order != null ? dto.sort_order : project.sort_order,
      is_active: dto.is_active != null ? dto.is_active : project.is_active,
      listing_image_url:
        dto.listing_image_url !== undefined
          ? dto.listing_image_url?.trim() || null
          : project.listing_image_url,
      ...(dto.page_content !== undefined
        ? { page_content: dto.page_content }
        : {}),
    });

    if (dto.initiatives) {
      await this.replaceInitiatives(id, dto.initiatives);
    }
    return this.findOne(id);
  }

  private async replaceInitiatives(
    projectId: number,
    rows: NonNullable<CreateWebsiteDonationProjectDto["initiatives"]>,
  ) {
    const existing = await this.initiativeRepo.find({
      where: { project_id: projectId, is_archived: false },
    });
    const keepIds = rows.map((r) => r.id).filter(Boolean);
    const toArchive = existing.filter((e) => !keepIds.includes(e.id));
    if (toArchive.length) {
      await this.initiativeRepo.update(
        { id: In(toArchive.map((r) => r.id)) },
        { is_archived: true },
      );
    }

    for (let index = 0; index < rows.length; index += 1) {
      const row = rows[index];
      const slug = this.normalizeSlug(row.slug);
      if (!slug || !row.title?.trim()) {
        throw new BadRequestException("Each initiative needs a slug and title");
      }
      const payload = {
        slug,
        title: row.title.trim(),
        subtitle: row.subtitle || null,
        price: row.price ?? 0,
        description: row.description || null,
        duration: row.duration || null,
        icon_key: row.icon_key || null,
        template_code: row.template_code || null,
        sort_order: row.sort_order ?? (index + 1) * 10,
        is_active: row.is_active !== false,
        project_id: projectId,
      };
      if (row.id) {
        await this.initiativeRepo.update(row.id, payload);
      } else {
        await this.initiativeRepo.save(this.initiativeRepo.create(payload));
      }
    }
  }

  async remove(id: number) {
    await this.findOne(id);
    await this.initiativeRepo.update(
      { project_id: id },
      { is_archived: true },
    );
    await this.projectRepo.update(id, { is_archived: true, is_active: false });
  }
}
