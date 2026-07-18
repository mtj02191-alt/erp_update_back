import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { AreaRationReport } from "./entities/area-ration-report.entity";
import { CreateAreaRationReportDto } from "./dto/create-area-ration-report.dto";
import { UpdateAreaRationReportDto } from "./dto/update-area-ration-report.dto";

@Injectable()
export class AreaRationReportsService {
  constructor(
    @InjectRepository(AreaRationReport)
    private readonly repo: Repository<AreaRationReport>,
  ) {}

  async create(dto: CreateAreaRationReportDto, user: any) {
    try {
      const entity = this.repo.create(dto);
      return await this.repo.save(entity);
    } catch (error) {
      console.log(error);
      throw new BadRequestException(error.message);
    }
  }

  async findAll(
    page = 1,
    pageSize = 10,
    sortField = "created_at",
    sortOrder: "ASC" | "DESC" = "DESC",
  ) {
    const skip = (page - 1) * pageSize;
    const whereClause = { is_archived: false };
    const [data, total] = await this.repo.findAndCount({
      where: whereClause,
      skip,
      take: pageSize,
      order: { [sortField]: sortOrder },
    });
    const totalPages = Math.ceil(total / pageSize);
    return {
      data,
      pagination: {
        page,
        pageSize,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  async findOne(id: number) {
    const entity = await this.repo.findOne({
      where: { id, is_archived: false },
    });
    if (!entity) throw new NotFoundException("Area ration report not found");
    return entity;
  }

  async update(id: number, dto: UpdateAreaRationReportDto) {
    const report = await this.repo.findOne({
      where: { id, is_archived: false },
    });
    if (!report) {
      throw new NotFoundException(`Area ration report with ID ${id} not found`);
    }
    await this.repo.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: number) {
    const entity = await this.findOne(id);
    if (!entity) {
      throw new NotFoundException(`Area ration report with ID ${id} not found`);
    }
    return this.repo.update(id, { is_archived: true });
  }
}
