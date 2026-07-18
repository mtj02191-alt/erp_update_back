import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { DreamSchool } from "./entities/dream_school.entity";
import { CreateDreamSchoolDto } from "./dto/create-dream_school.dto";
import { UpdateDreamSchoolDto } from "./dto/update-dream_school.dto";

@Injectable()
export class DreamSchoolsService {
  constructor(
    @InjectRepository(DreamSchool)
    private readonly dreamSchoolRepository: Repository<DreamSchool>,
  ) {}

  private normalizeSortField(sortField?: string) {
    const allowed = new Set([
      "id",
      "school_code",
      "student_count",
      "location",
      "kawish_id",
      "created_at",
      "updated_at",
      "is_archived",
    ]);
    if (!sortField || !allowed.has(sortField)) return "created_at";
    return sortField;
  }

  private normalizeSortOrder(sortOrder?: string) {
    return sortOrder === "ASC" ? "ASC" : "DESC";
  }

  private async generateSchoolCode(): Promise<string> {
    const year = new Date().getFullYear() % 100;
    const prefix = `MTJF-EDU/DS-${String(year).padStart(2, "0")}-`;
    const rows = await this.dreamSchoolRepository
      .createQueryBuilder("d")
      .select("d.school_code", "school_code")
      .where("d.school_code LIKE :prefix", { prefix: `${prefix}%` })
      .andWhere("d.is_archived = false")
      .getRawMany<{ school_code: string }>();

    let maxSeq = 0;
    for (const r of rows) {
      const m = r.school_code?.match(
        new RegExp(`^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(\\d+)$`),
      );
      if (m) maxSeq = Math.max(maxSeq, parseInt(m[1], 10));
    }
    const next = String(maxSeq + 1).padStart(2, "0");
    return `${prefix}${next}`;
  }

  async create(createDto: CreateDreamSchoolDto, user: any) {
    const school_code = await this.generateSchoolCode();
    const entity = this.dreamSchoolRepository.create({
      school_code,
      student_count: createDto.student_count,
      location: createDto.location,
      kawish_id: createDto.kawish_id,
      is_archived: false,
      created_by: user,
      updated_by: user,
    });
    const saved = await this.dreamSchoolRepository.save(entity);
    return {
      success: true,
      message: "Dream school created successfully",
      data: saved,
    };
  }

  async findAll(params: {
    page?: number;
    pageSize?: number;
    sortField?: string;
    sortOrder?: "ASC" | "DESC";
    search?: string;
  }) {
    const { page = 1, pageSize = 10, sortField, sortOrder, search } = params;
    const query = this.dreamSchoolRepository
      .createQueryBuilder("d")
      .where("d.is_archived = false");

    if (search) {
      query.andWhere(
        "(d.school_code ILIKE :q OR d.location ILIKE :q OR d.kawish_id ILIKE :q)",
        { q: `%${search}%` },
      );
    }

    const safeSort = this.normalizeSortField(sortField);
    const safeOrder = this.normalizeSortOrder(sortOrder);

    const [rows, total] = await query
      .orderBy(`d.${safeSort}`, safeOrder)
      .skip((page - 1) * pageSize)
      .take(pageSize)
      .getManyAndCount();

    return {
      success: true,
      data: rows,
      pagination: {
        page,
        pageSize,
        total,
        totalPages: Math.ceil(total / pageSize),
      },
    };
  }

  async findOne(id: number) {
    const found = await this.dreamSchoolRepository.findOne({
      where: { id, is_archived: false },
    });
    if (!found) throw new BadRequestException("Dream school not found");
    return { success: true, data: found };
  }

  async update(id: number, updateDto: UpdateDreamSchoolDto, user: any) {
    const existing = await this.dreamSchoolRepository.findOne({
      where: { id, is_archived: false },
    });
    if (!existing) throw new BadRequestException("Dream school not found");

    const { school_code: _ignored, ...rest } =
      updateDto as UpdateDreamSchoolDto & { school_code?: string };

    await this.dreamSchoolRepository.update(id, {
      ...rest,
      updated_by: user,
    });
    const updated = await this.dreamSchoolRepository.findOne({
      where: { id, is_archived: false },
    });
    return {
      success: true,
      message: "Dream school updated successfully",
      data: updated,
    };
  }

  async remove(id: number) {
    const existing = await this.dreamSchoolRepository.findOne({
      where: { id, is_archived: false },
    });
    if (!existing) throw new BadRequestException("Dream school not found");
    await this.dreamSchoolRepository.update(id, { is_archived: true });
    return { success: true, message: "Dream school deleted successfully" };
  }
}
