import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AlHasanainClg } from "./entities/al_hasanain_clg.entity";
import { CreateAlHasanainClgDto } from "./dto/create-al_hasanain_clg.dto";
import { UpdateAlHasanainClgDto } from "./dto/update-al_hasanain_clg.dto";

@Injectable()
export class AlHasanainClgService {
  constructor(
    @InjectRepository(AlHasanainClg)
    private readonly repo: Repository<AlHasanainClg>,
  ) {}

  private normalizeSortField(sortField?: string) {
    const allowed = new Set([
      "id",
      "total_students",
      "attendance_percent",
      "dropout_rate",
      "pass_rate",
      "fee_collection",
      "active_teachers",
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

  async create(dto: CreateAlHasanainClgDto, user: any) {
    const entity = this.repo.create({
      total_students: dto.total_students,
      attendance_percent: dto.attendance_percent,
      dropout_rate: dto.dropout_rate,
      pass_rate: dto.pass_rate,
      fee_collection: dto.fee_collection,
      active_teachers: dto.active_teachers,
      is_archived: false,
      created_by: user,
      updated_by: user,
    });
    const saved = await this.repo.save(entity);
    return {
      success: true,
      message: "Al Hasanain CLG record created successfully",
      data: saved,
    };
  }

  async findAll(params: {
    page?: number;
    pageSize?: number;
    sortField?: string;
    sortOrder?: "ASC" | "DESC";
  }) {
    const { page = 1, pageSize = 10, sortField, sortOrder } = params;
    const query = this.repo
      .createQueryBuilder("a")
      .where("a.is_archived = false");
    const safeSort = this.normalizeSortField(sortField);
    const safeOrder = this.normalizeSortOrder(sortOrder);

    const [rows, total] = await query
      .orderBy(`a.${safeSort}`, safeOrder)
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
    const found = await this.repo.findOne({
      where: { id, is_archived: false },
    });
    if (!found)
      throw new BadRequestException("Al Hasanain CLG record not found");
    return { success: true, data: found };
  }

  async update(id: number, dto: UpdateAlHasanainClgDto, user: any) {
    const existing = await this.repo.findOne({
      where: { id, is_archived: false },
    });
    if (!existing)
      throw new BadRequestException("Al Hasanain CLG record not found");

    const patch: Partial<AlHasanainClg> = { updated_by: user };
    if (dto.total_students !== undefined)
      patch.total_students = dto.total_students;
    if (dto.attendance_percent !== undefined)
      patch.attendance_percent = dto.attendance_percent;
    if (dto.dropout_rate !== undefined) patch.dropout_rate = dto.dropout_rate;
    if (dto.pass_rate !== undefined) patch.pass_rate = dto.pass_rate;
    if (dto.fee_collection !== undefined)
      patch.fee_collection = dto.fee_collection;
    if (dto.active_teachers !== undefined)
      patch.active_teachers = dto.active_teachers;

    await this.repo.update(id, patch);
    const updated = await this.repo.findOne({
      where: { id, is_archived: false },
    });
    return {
      success: true,
      message: "Al Hasanain CLG record updated successfully",
      data: updated,
    };
  }

  async remove(id: number) {
    const existing = await this.repo.findOne({
      where: { id, is_archived: false },
    });
    if (!existing)
      throw new BadRequestException("Al Hasanain CLG record not found");
    await this.repo.update(id, { is_archived: true });
    return {
      success: true,
      message: "Al Hasanain CLG record deleted successfully",
    };
  }
}
