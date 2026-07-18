import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { SewingMachineReport } from "./entities/sewing-machine-report.entity";
import { CreateSewingMachineReportDto } from "./dto/create-sewing-machine-report.dto";
import { UpdateSewingMachineReportDto } from "./dto/update-sewing-machine-report.dto";
import { User } from "../../../users/user.entity";

@Injectable()
export class SewingMachineReportsService {
  constructor(
    @InjectRepository(SewingMachineReport)
    private readonly sewingMachineReportRepository: Repository<SewingMachineReport>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(
    createDto: CreateSewingMachineReportDto,
    user: User,
  ): Promise<SewingMachineReport> {
    try {
      const dbUser = await this.userRepository.findOne({
        where: { id: user.id },
      });
      const report = this.sewingMachineReportRepository.create({
        date: new Date(createDto.date),
        orphans: createDto.orphans || 0,
        divorced: createDto.divorced || 0,
        disable: createDto.disable || 0,
        indegent: createDto.indegent || 0,
        created_by: dbUser,
        updated_by: dbUser,
      });
      return await this.sewingMachineReportRepository.save(report);
    } catch (error) {
      throw new BadRequestException(error.message);
    }
  }

  async findAll(
    page: number = 1,
    pageSize: number = 10,
    sortField: string = "date",
    sortOrder: "ASC" | "DESC" = "DESC",
  ): Promise<{ data: any[]; pagination: any }> {
    try {
      const skip = (page - 1) * pageSize;

      const queryBuilder = this.sewingMachineReportRepository
        .createQueryBuilder("report")
        .where({ is_archived: false })
        .orderBy(`report.${sortField}`, sortOrder)
        .skip(skip)
        .take(pageSize);

      const reports = await queryBuilder.getMany();
      const total = await this.sewingMachineReportRepository.count({
        where: { is_archived: false },
      });
      const totalPages = Math.ceil(total / pageSize);

      const formattedReports = reports.map((report) => ({
        id: report.id,
        date: report.date,
        assistance: {
          Orphans: report.orphans,
          Divorced: report.divorced,
          Disable: report.disable,
          Indegent: report.indegent,
        },
      }));

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
        "Failed to fetch sewing machine reports: " + error.message,
      );
    }
  }

  async findOne(id: number): Promise<SewingMachineReport> {
    const report = await this.sewingMachineReportRepository.findOne({
      where: { id, is_archived: false },
    });
    if (!report) {
      throw new NotFoundException(
        `Sewing machine report with ID ${id} not found`,
      );
    }
    return report;
  }

  async update(
    id: number,
    updateDto: UpdateSewingMachineReportDto,
  ): Promise<SewingMachineReport> {
    const report = await this.sewingMachineReportRepository.findOne({
      where: { id, is_archived: false },
    });
    if (!report) {
      throw new NotFoundException(
        `Sewing machine report with ID ${id} not found`,
      );
    }

    if (updateDto.date) {
      report.date = updateDto.date;
    }
    if (updateDto.orphans !== undefined) {
      report.orphans = updateDto.orphans;
    }
    if (updateDto.divorced !== undefined) {
      report.divorced = updateDto.divorced;
    }
    if (updateDto.disable !== undefined) {
      report.disable = updateDto.disable;
    }
    if (updateDto.indegent !== undefined) {
      report.indegent = updateDto.indegent;
    }

    return await this.sewingMachineReportRepository.save(report);
  }

  async remove(id: number): Promise<void> {
    const report = await this.sewingMachineReportRepository.findOne({
      where: { id, is_archived: false },
    });
    if (!report) {
      throw new NotFoundException(
        `Sewing machine report with ID ${id} not found`,
      );
    }
    await this.sewingMachineReportRepository.update(id, { is_archived: true });
  }
}
