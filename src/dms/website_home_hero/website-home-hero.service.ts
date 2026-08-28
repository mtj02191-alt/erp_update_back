import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { WebsiteHomeHeroSlide } from "./entities/website-home-hero-slide.entity";
import { CreateWebsiteHomeHeroSlideDto } from "./dto/create-website-home-hero-slide.dto";
import { UpdateWebsiteHomeHeroSlideDto } from "./dto/update-website-home-hero-slide.dto";

@Injectable()
export class WebsiteHomeHeroService {
  constructor(
    @InjectRepository(WebsiteHomeHeroSlide)
    private readonly slideRepo: Repository<WebsiteHomeHeroSlide>,
  ) {}

  /** Public website shape — matches Hero.jsx HERO_IMAGES entries. */
  toPublicSlide(slide: WebsiteHomeHeroSlide) {
    return {
      desktop: slide.desktop_image_url || "",
      mobile: slide.mobile_image_url || "",
      link: slide.link || null,
    };
  }

  async findPublicSlides() {
    const slides = await this.slideRepo.find({
      where: { is_archived: false, is_active: true },
      order: { sort_order: "ASC", id: "ASC" },
    });
    return slides
      .filter((s) => s.desktop_image_url && s.mobile_image_url)
      .map((s) => this.toPublicSlide(s));
  }

  async findAll(params: {
    page?: number;
    pageSize?: number;
    search?: string;
  }) {
    const page = Number(params.page) || 1;
    const pageSize = Number(params.pageSize) || 50;
    const qb = this.slideRepo
      .createQueryBuilder("slide")
      .where("slide.is_archived = false");

    if (params.search) {
      qb.andWhere(
        "(slide.title ILIKE :search OR slide.link ILIKE :search)",
        { search: `%${params.search}%` },
      );
    }

    const total = await qb.getCount();
    const items = await qb
      .orderBy("slide.sort_order", "ASC")
      .addOrderBy("slide.id", "ASC")
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
    const slide = await this.slideRepo.findOne({
      where: { id, is_archived: false },
    });
    if (!slide) {
      throw new NotFoundException(`Home hero slide ${id} not found`);
    }
    return slide;
  }

  private requireImageUrl(url: string | undefined | null, field: string) {
    const trimmed = String(url || "").trim();
    if (!trimmed) {
      throw new BadRequestException(`${field} is required`);
    }
    return trimmed;
  }

  async create(dto: CreateWebsiteHomeHeroSlideDto) {
    const slide = this.slideRepo.create({
      title: dto.title?.trim() || null,
      desktop_image_url: this.requireImageUrl(
        dto.desktop_image_url,
        "desktop_image_url",
      ),
      mobile_image_url: this.requireImageUrl(
        dto.mobile_image_url,
        "mobile_image_url",
      ),
      link: dto.link?.trim() || null,
      sort_order: dto.sort_order ?? 0,
      is_active: dto.is_active !== false,
    });
    return this.slideRepo.save(slide);
  }

  async update(id: number, dto: UpdateWebsiteHomeHeroSlideDto) {
    const slide = await this.findOne(id);
    if (dto.title !== undefined) {
      slide.title = dto.title?.trim() || null;
    }
    if (dto.desktop_image_url !== undefined) {
      slide.desktop_image_url = this.requireImageUrl(
        dto.desktop_image_url,
        "desktop_image_url",
      );
    }
    if (dto.mobile_image_url !== undefined) {
      slide.mobile_image_url = this.requireImageUrl(
        dto.mobile_image_url,
        "mobile_image_url",
      );
    }
    if (dto.link !== undefined) {
      slide.link = dto.link?.trim() || null;
    }
    if (dto.sort_order !== undefined) {
      slide.sort_order = Number(dto.sort_order) || 0;
    }
    if (dto.is_active !== undefined) {
      slide.is_active = !!dto.is_active;
    }
    return this.slideRepo.save(slide);
  }

  async remove(id: number) {
    const slide = await this.findOne(id);
    slide.is_archived = true;
    slide.is_active = false;
    await this.slideRepo.save(slide);
  }
}
