import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { CreateHealthDto } from "./dto/create-health.dto";
import { UpdateHealthDto } from "./dto/update-health.dto";
import { Repository, SelectQueryBuilder } from "typeorm";
import { HealthReport } from "./entities/health.entity";
import { User } from "../../users/user.entity";
import { HEALTH_REPORT_TYPES } from "./dto/create-health.dto";

@Injectable()
export class HealthService {
  constructor(
    @InjectRepository(HealthReport)
    private readonly healthReportRepository: Repository<HealthReport>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(createDto: CreateHealthDto, user: User) {
    try {
      const dbUser = await this.userRepository.findOne({
        where: { id: user.id },
      });
      const report = this.healthReportRepository.create({
        date: new Date(createDto.date),
        type: createDto.type,
        widows: createDto.widows || 0,
        divorced: createDto.divorced || 0,
        disable: createDto.disable || 0,
        indegent: createDto.indegent || 0,
        orphans: createDto.orphans || 0,
        created_by: dbUser,
        updated_by: dbUser,
      });
      return await this.healthReportRepository.save(report);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async createMultiple(createDtos: CreateHealthDto[]): Promise<HealthReport[]> {
    const reports = createDtos.map((dto) =>
      this.healthReportRepository.create({
        date: new Date(dto.date),
        type: dto.type,
        widows: dto.widows || 0,
        divorced: dto.divorced || 0,
        disable: dto.disable || 0,
        indegent: dto.indegent || 0,
        orphans: dto.orphans || 0,
      }),
    );

    return await this.healthReportRepository.save(reports);
  }

  async findAll(
    page: number = 1,
    pageSize: number = 10,
    sortField: string = "date",
    sortOrder: "ASC" | "DESC" = "DESC",
  ): Promise<{ data: any[]; pagination: any }> {
    try {
      const skip = (page - 1) * pageSize;

      const queryBuilder = this.healthReportRepository
        .createQueryBuilder("report")
        .where({ is_archived: false })
        .orderBy(`report.${sortField}`, sortOrder)
        .skip(skip)
        .take(pageSize);

      const reports = await queryBuilder.getMany();
      const total = await this.healthReportRepository.count({
        where: { is_archived: false },
      });
      const totalPages = Math.ceil(total / pageSize);

      const groupedReports = reports.reduce((acc, report) => {
        const dateKey =
          report.date instanceof Date
            ? report.date.toISOString().split("T")[0]
            : new Date(report.date).toISOString().split("T")[0];

        if (!acc[dateKey]) {
          acc[dateKey] = {
            id: report.id,
            date: report.date,
            distributions: [],
          };
        }

        acc[dateKey].distributions.push({
          id: report.id,
          type: report.type,
          vulnerabilities: {
            Widows: report.widows,
            Divorced: report.divorced,
            Disable: report.disable,
            Indegent: report.indegent,
            Orphans: report.orphans,
          },
        });

        return acc;
      }, {});

      return {
        data: Object.values(groupedReports),
        pagination: {
          total,
          page,
          pageSize,
          totalPages,
        },
      };
    } catch (error) {
      throw new BadRequestException(
        "Failed to fetch health reports: " + error.message,
      );
    }
  }

  async findOne(id: number): Promise<HealthReport> {
    const report = await this.healthReportRepository.findOne({
      where: { id, is_archived: false },
    });
    if (!report)
      throw new NotFoundException(`Health report with ID ${id} not found`);
    return report;
  }

  async findByDate(date: string): Promise<HealthReport[]> {
    return await this.healthReportRepository.find({
      where: { date: new Date(date), is_archived: false },
      order: { id: "ASC" },
    });
  }

  async update(id: number, updateDto: UpdateHealthDto): Promise<HealthReport> {
    const report = await this.healthReportRepository.findOne({
      where: { id, is_archived: false },
    });
    if (!report)
      throw new NotFoundException(`Health report with ID ${id} not found`);

    if (updateDto.date) report.date = new Date(updateDto.date);
    if (updateDto.type) report.type = updateDto.type;
    if (updateDto.widows !== undefined) report.widows = updateDto.widows;
    if (updateDto.divorced !== undefined) report.divorced = updateDto.divorced;
    if (updateDto.disable !== undefined) report.disable = updateDto.disable;
    if (updateDto.indegent !== undefined) report.indegent = updateDto.indegent;
    if (updateDto.orphans !== undefined) report.orphans = updateDto.orphans;

    return await this.healthReportRepository.save(report);
  }

  async remove(id: number): Promise<void> {
    const report = await this.healthReportRepository.findOne({
      where: { id, is_archived: false },
    });
    if (!report)
      throw new NotFoundException(`Health report with ID ${id} not found`);
    await this.healthReportRepository.update(id, { is_archived: true });
  }

  async removeByDate(date: string): Promise<void> {
    const reports = await this.findByDate(date);
    if (!reports || reports.length === 0)
      throw new NotFoundException(`Health reports with date ${date} not found`);
    await this.healthReportRepository.update(
      { date: new Date(date) },
      { is_archived: true },
    );
  }

  private applyDateRange(
    qb: SelectQueryBuilder<HealthReport>,
    alias: string,
    from?: string,
    to?: string,
  ): void {
    const col = `${alias}.date`;
    if (from && to) {
      qb.andWhere(`${col} BETWEEN :from AND :to`, { from, to });
    } else if (from) {
      qb.andWhere(`${col} >= :from`, { from });
    } else if (to) {
      qb.andWhere(`${col} <= :to`, { to });
    }
  }

  /**
   * Totals per report `type` (e.g. Medicines, Ambulance) for an optional date range.
   * Each "total" is the sum of all vulnerability columns for that type.
   */
  async getTotalsByType(
    from?: string,
    to?: string,
  ): Promise<{
    from?: string;
    to?: string;
    types: Array<{
      type: string;
      widows: number;
      divorced: number;
      disable: number;
      indegent: number;
      orphans: number;
      total: number;
    }>;
    grand_total: number;
  }> {
    const qb = this.healthReportRepository
      .createQueryBuilder("h")
      .select("h.type", "type")
      .addSelect("COALESCE(SUM(h.widows), 0)", "widows")
      .addSelect("COALESCE(SUM(h.divorced), 0)", "divorced")
      .addSelect("COALESCE(SUM(h.disable), 0)", "disable")
      .addSelect("COALESCE(SUM(h.indegent), 0)", "indegent")
      .addSelect("COALESCE(SUM(h.orphans), 0)", "orphans")
      .addSelect(
        "COALESCE(SUM(h.widows + h.divorced + h.disable + h.indegent + h.orphans), 0)",
        "total",
      )
      .where("h.is_archived = false")
      .groupBy("h.type");

    this.applyDateRange(qb, "h", from, to);

    const rows = await qb.getRawMany<{
      type: string;
      widows: string;
      divorced: string;
      disable: string;
      indegent: string;
      orphans: string;
      total: string;
    }>();

    const byType = new Map<string, any>();
    for (const r of rows) {
      byType.set(r.type, {
        type: r.type,
        widows: Number(r.widows ?? 0),
        divorced: Number(r.divorced ?? 0),
        disable: Number(r.disable ?? 0),
        indegent: Number(r.indegent ?? 0),
        orphans: Number(r.orphans ?? 0),
        total: Number(r.total ?? 0),
      });
    }

    const types = (HEALTH_REPORT_TYPES as readonly string[]).map((t) => {
      return (
        byType.get(t) ?? {
          type: t,
          widows: 0,
          divorced: 0,
          disable: 0,
          indegent: 0,
          orphans: 0,
          total: 0,
        }
      );
    });

    const grand_total = types.reduce((s, t) => s + (Number(t.total) || 0), 0);
    return { from, to, types, grand_total };
  }
}
