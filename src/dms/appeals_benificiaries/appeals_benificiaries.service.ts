import { Injectable, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AppealsBenificiary } from "./entities/appeals_benificiary.entity";
import { CreateAppealsBenificiaryDto } from "./dto/create-appeals_benificiary.dto";
import { UpdateAppealsBenificiaryDto } from "./dto/update-appeals_benificiary.dto";

@Injectable()
export class AppealsBenificiariesService {
  constructor(
    @InjectRepository(AppealsBenificiary)
    private readonly beneficiaryRepo: Repository<AppealsBenificiary>,
  ) {}

  async create(dto: CreateAppealsBenificiaryDto): Promise<AppealsBenificiary> {
    const entity = this.beneficiaryRepo.create({
      name: dto.name,
      age: dto.age ?? null,
      location: dto.location ?? null,
      bio: dto.bio ?? null,
      profile_image_url: dto.profile_image_url ?? null,
    });
    return this.beneficiaryRepo.save(entity);
  }

  async findOne(id: number): Promise<AppealsBenificiary> {
    const row = await this.beneficiaryRepo.findOne({ where: { id } });
    if (!row) {
      throw new NotFoundException(`Beneficiary #${id} not found`);
    }
    return row;
  }

  async update(
    id: number,
    dto: UpdateAppealsBenificiaryDto,
  ): Promise<AppealsBenificiary> {
    const row = await this.findOne(id);
    if (dto.name !== undefined) row.name = dto.name;
    if (dto.age !== undefined) row.age = dto.age;
    if (dto.location !== undefined) row.location = dto.location;
    if (dto.bio !== undefined) row.bio = dto.bio;
    if (dto.profile_image_url !== undefined) {
      row.profile_image_url = dto.profile_image_url;
    }
    return this.beneficiaryRepo.save(row);
  }

  async remove(id: number): Promise<void> {
    const row = await this.findOne(id);
    row.is_archived = true;
    await this.beneficiaryRepo.save(row);
  }
}
