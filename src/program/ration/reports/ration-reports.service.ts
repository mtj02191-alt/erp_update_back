import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { RationReport } from "./entities/ration-report.entity";
import { CreateRationReportDto } from "./dto/create-ration-report.dto";
import { UpdateRationReportDto } from "./dto/update-ration-report.dto";
import { User } from "../../../users/user.entity";

const LIFE_TIME_GRANULAR_KEYS = [
  "life_time_full_widows",
  "life_time_full_divorced",
  "life_time_full_disable",
  "life_time_full_indegent",
  "life_time_full_orphan",
  "life_time_half_widows",
  "life_time_half_divorced",
  "life_time_half_disable",
  "life_time_half_indegent",
  "life_time_half_orphan",
] as const;

@Injectable()
export class RationReportsService {
  constructor(
    @InjectRepository(RationReport)
    private rationReportRepository: Repository<RationReport>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private sumLifeTimeGranular(o: Record<string, unknown>): number {
    return LIFE_TIME_GRANULAR_KEYS.reduce((s, k) => s + Number(o[k] ?? 0), 0);
  }

  private mapVulnerabilityBlock(
    report: RationReport,
    prefix: "full" | "half" | "life_time_full" | "life_time_half",
  ) {
    return {
      Widows: Number(report[`${prefix}_widows` as keyof RationReport] ?? 0),
      Divorced: Number(report[`${prefix}_divorced` as keyof RationReport] ?? 0),
      Disable: Number(report[`${prefix}_disable` as keyof RationReport] ?? 0),
      Indegent: Number(report[`${prefix}_indegent` as keyof RationReport] ?? 0),
      Orphan: Number(report[`${prefix}_orphan` as keyof RationReport] ?? 0),
    };
  }

  private formatReport(report: RationReport) {
    return {
      id: report.id,
      date: report.report_date,
      is_alternate: report.is_alternate,
      full: this.mapVulnerabilityBlock(report, "full"),
      half: this.mapVulnerabilityBlock(report, "half"),
      life_time_full: this.mapVulnerabilityBlock(report, "life_time_full"),
      life_time_half: this.mapVulnerabilityBlock(report, "life_time_half"),
      life_time: report.life_time,
    };
  }

  async create(
    createRationReportDto: CreateRationReportDto,
    user: User,
  ): Promise<any> {
    try {
      const dbUser = await this.userRepository.findOne({
        where: { id: user.id },
      });
      const pad = Object.fromEntries(
        LIFE_TIME_GRANULAR_KEYS.map((k) => [k, 0]),
      ) as Record<string, unknown>;
      const mergedLt = {
        ...pad,
        ...(createRationReportDto as unknown as Record<string, unknown>),
      };
      const lifeTimeTotal = this.sumLifeTimeGranular(mergedLt);
      const rationReport = this.rationReportRepository.create({
        ...createRationReportDto,
        ...Object.fromEntries(
          LIFE_TIME_GRANULAR_KEYS.map((k) => [k, Number(mergedLt[k] ?? 0)]),
        ),
        life_time: lifeTimeTotal,
        created_by: dbUser,
        updated_by: dbUser,
      });
      const savedReport = await this.rationReportRepository.save(rationReport);

      return this.formatReport(savedReport);
    } catch (error) {
      throw new BadRequestException(
        "Failed to create ration report: " + error.message,
      );
    }
  }

  async findAll(
    page: number = 1,
    pageSize: number = 10,
    sortField: string = "created_at",
    sortOrder: "ASC" | "DESC" = "DESC",
  ): Promise<{ data: any[]; pagination: any }> {
    try {
      const skip = (page - 1) * pageSize;

      const queryBuilder = this.rationReportRepository
        .createQueryBuilder("report")
        .where({ is_archived: false })
        .orderBy(`report.${sortField}`, sortOrder)
        .skip(skip)
        .take(pageSize);

      const reports = await queryBuilder.getMany();
      const total = await this.rationReportRepository.count({
        where: { is_archived: false },
      });
      const totalPages = Math.ceil(total / pageSize);

      const formattedReports = reports.map((report) =>
        this.formatReport(report),
      );

      return {
        data: formattedReports,
        pagination: {
          total,
          page,
          pageSize,
          totalPages,
        },
      };
    } catch (error) {
      throw new BadRequestException(
        "Failed to fetch ration reports: " + error.message,
      );
    }
  }

  async findOne(id: number): Promise<any> {
    try {
      const report = await this.rationReportRepository.findOne({
        where: { id, is_archived: false },
      });

      if (!report) {
        throw new NotFoundException(`Ration report with ID ${id} not found`);
      }

      return this.formatReport(report);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        "Failed to fetch ration report: " + error.message,
      );
    }
  }

  async update(
    id: number,
    updateRationReportDto: UpdateRationReportDto,
  ): Promise<any> {
    try {
      const entity = await this.rationReportRepository.findOne({
        where: { id, is_archived: false },
      });
      if (!entity) {
        throw new NotFoundException(`Ration report with ID ${id} not found`);
      }
      Object.assign(entity, updateRationReportDto);
      entity.life_time = this.sumLifeTimeGranular(
        entity as unknown as Record<string, unknown>,
      );
      await this.rationReportRepository.save(entity);
      return this.findOne(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        "Failed to update ration report: " + error.message,
      );
    }
  }

  async remove(id: number): Promise<void> {
    try {
      const report = await this.rationReportRepository.findOne({
        where: { id, is_archived: false },
      });
      if (!report) {
        throw new NotFoundException(`Ration report with ID ${id} not found`);
      }
      await this.rationReportRepository.update(id, { is_archived: true });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        "Failed to delete ration report: " + error.message,
      );
    }
  }
}
