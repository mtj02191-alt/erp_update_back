import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AppealMedia } from "./entities/appeal_media.entity";
import { CreateAppealMediaDto } from "./dto/create-appeal_media.dto";
import { UpdateAppealMediaDto } from "./dto/update-appeal_media.dto";

@Injectable()
export class AppealMediaService {
  constructor(
    @InjectRepository(AppealMedia)
    private readonly mediaRepo: Repository<AppealMedia>,
  ) {}

  async findByAppeal(appealId: number): Promise<AppealMedia[]> {
    return this.mediaRepo.find({
      where: { appeal_id: appealId, is_archived: false },
      order: { sort_order: "ASC", created_at: "ASC" },
    });
  }

  async findOne(id: number): Promise<AppealMedia> {
    const row = await this.mediaRepo.findOne({ where: { id } });
    if (!row) throw new NotFoundException(`Appeal media #${id} not found`);
    return row;
  }

  async create(dto: CreateAppealMediaDto): Promise<AppealMedia> {
    const entity = this.mediaRepo.create({
      appeal_id: dto.appeal_id,
      url: dto.url,
      media_type: dto.media_type,
      caption: dto.caption ?? null,
      sort_order: dto.sort_order ?? 0,
    });
    return this.mediaRepo.save(entity);
  }

  async update(id: number, dto: UpdateAppealMediaDto): Promise<AppealMedia> {
    const row = await this.findOne(id);
    if (dto.url !== undefined) row.url = dto.url;
    if (dto.media_type !== undefined) row.media_type = dto.media_type;
    if (dto.caption !== undefined) row.caption = dto.caption;
    if (dto.sort_order !== undefined) row.sort_order = dto.sort_order;
    return this.mediaRepo.save(row);
  }

  async remove(id: number): Promise<void> {
    const row = await this.findOne(id);
    row.is_archived = true;
    await this.mediaRepo.save(row);
  }
}
