import { BadRequestException, Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AasCollectionCentersReport } from "./entities/aas_collection_centers_report.entity";
import { CreateAasCollectionCentersReportDto } from "./dto/create-aas_collection_centers_report.dto";
import { UpdateAasCollectionCentersReportDto } from "./dto/update-aas_collection_centers_report.dto";

@Injectable()
export class AasCollectionCentersReportService {
  constructor(
    @InjectRepository(AasCollectionCentersReport)
    private readonly reportRepository: Repository<AasCollectionCentersReport>,
  ) {}

  private normalizeSortField(sortField?: string) {
    const allowed = new Set([
      "id",
      "total_patients",
      "tests_conducted",
      "pending_tests",
      "revenue",
      "on_time_delivery_percent",
      "total_camps",
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

  async create(dto: CreateAasCollectionCentersReportDto, user: any) {
    const entity = this.reportRepository.create({
      total_patients: dto.total_patients,
      tests_conducted: dto.tests_conducted,
      pending_tests: dto.pending_tests,
      revenue: dto.revenue,
      on_time_delivery_percent: dto.on_time_delivery_percent,
      total_camps: dto.total_camps,
      camp_wise_patients: dto.camp_wise_patients ?? [],
      is_archived: false,
      created_by: user,
      updated_by: user,
    });
    const saved = await this.reportRepository.save(entity);
    return {
      success: true,
      message: "AAS collection centers report created successfully",
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
    const query = this.reportRepository
      .createQueryBuilder("r")
      .where("r.is_archived = false");

    const safeSort = this.normalizeSortField(sortField);
    const safeOrder = this.normalizeSortOrder(sortOrder);

    const [rows, total] = await query
      .orderBy(`r.${safeSort}`, safeOrder)
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
    const found = await this.reportRepository.findOne({
      where: { id, is_archived: false },
    });
    if (!found)
      throw new BadRequestException("AAS collection centers report not found");
    return { success: true, data: found };
  }

  async update(
    id: number,
    dto: UpdateAasCollectionCentersReportDto,
    user: any,
  ) {
    const existing = await this.reportRepository.findOne({
      where: { id, is_archived: false },
    });
    if (!existing)
      throw new BadRequestException("AAS collection centers report not found");

    const patch: Partial<AasCollectionCentersReport> = { updated_by: user };
    if (dto.total_patients !== undefined)
      patch.total_patients = dto.total_patients;
    if (dto.tests_conducted !== undefined)
      patch.tests_conducted = dto.tests_conducted;
    if (dto.pending_tests !== undefined)
      patch.pending_tests = dto.pending_tests;
    if (dto.revenue !== undefined) patch.revenue = dto.revenue;
    if (dto.on_time_delivery_percent !== undefined)
      patch.on_time_delivery_percent = dto.on_time_delivery_percent;
    if (dto.total_camps !== undefined) patch.total_camps = dto.total_camps;
    if (dto.camp_wise_patients !== undefined)
      patch.camp_wise_patients = dto.camp_wise_patients;

    await this.reportRepository.update(id, patch);
    const updated = await this.reportRepository.findOne({
      where: { id, is_archived: false },
    });
    return {
      success: true,
      message: "AAS collection centers report updated successfully",
      data: updated,
    };
  }

  async remove(id: number) {
    const existing = await this.reportRepository.findOne({
      where: { id, is_archived: false },
    });
    if (!existing)
      throw new BadRequestException("AAS collection centers report not found");
    await this.reportRepository.update(id, { is_archived: true });
    return {
      success: true,
      message: "AAS collection centers report deleted successfully",
    };
  }
}
