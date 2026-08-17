import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AppealUpdate } from "./entities/appeal_update.entity";
import { CreateAppealUpdateDto } from "./dto/create-appeal_update.dto";
import { UpdateAppealUpdateDto } from "./dto/update-appeal_update.dto";

@Injectable()
export class AppealUpdatesService {
  constructor(
    @InjectRepository(AppealUpdate)
    private readonly updateRepo: Repository<AppealUpdate>,
  ) {}

  async findByAppeal(appealId: number): Promise<AppealUpdate[]> {
    return this.updateRepo.find({
      where: { appeal_id: appealId, is_archived: false },
      order: { published_at: "DESC", created_at: "DESC" },
    });
  }

  async findOne(id: number): Promise<AppealUpdate> {
    const row = await this.updateRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException(`Appeal update #${id} not found`);
    return row;
  }

  async create(dto: CreateAppealUpdateDto): Promise<AppealUpdate> {
    const entity = this.updateRepo.create({
      appeal_id: dto.appeal_id,
      title: dto.title,
      content: dto.content,
      published_at: dto.published_at ? new Date(dto.published_at) : new Date(),
      is_published: dto.is_published ?? true,
      is_highlighted: dto.is_highlighted ?? false,
      image_urls: dto.image_urls ?? null,
    });
    return this.updateRepo.save(entity);
  }

  async update(id: number, dto: UpdateAppealUpdateDto): Promise<AppealUpdate> {
    const row = await this.findOne(id);
    if (dto.title !== undefined) row.title = dto.title;
    if (dto.content !== undefined) row.content = dto.content;
    if (dto.published_at !== undefined) {
      row.published_at = dto.published_at ? new Date(dto.published_at) : null;
    }
    if (dto.is_published !== undefined) row.is_published = dto.is_published;
    if (dto.is_highlighted !== undefined) row.is_highlighted = dto.is_highlighted;
    if (dto.image_urls !== undefined) row.image_urls = dto.image_urls;
    return this.updateRepo.save(row);
  }

  async remove(id: number): Promise<void> {
    const row = await this.findOne(id);
    row.is_archived = true;
    await this.updateRepo.save(row);
  }
}
