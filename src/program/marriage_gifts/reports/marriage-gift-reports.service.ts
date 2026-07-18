import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { MarriageGiftReport } from "./entities/marriage-gift-report.entity";
import { CreateMarriageGiftReportDto } from "./dto/create-marriage-gift-report.dto";
import { UpdateMarriageGiftReportDto } from "./dto/update-marriage-gift-report.dto";
import { User } from "../../../users/user.entity";

@Injectable()
export class MarriageGiftReportsService {
  constructor(
    @InjectRepository(MarriageGiftReport)
    private marriageGiftReportRepository: Repository<MarriageGiftReport>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(
    createMarriageGiftReportDto: CreateMarriageGiftReportDto,
    user: User,
  ): Promise<any> {
    try {
      const dbUser = await this.userRepository.findOne({
        where: { id: user.id },
      });
      const marriageGiftReport = this.marriageGiftReportRepository.create({
        ...createMarriageGiftReportDto,
        created_by: dbUser,
        updated_by: dbUser,
      });
      const savedReport =
        await this.marriageGiftReportRepository.save(marriageGiftReport);

      return {
        id: savedReport.id,
        date: savedReport.report_date,
        gifts: {
          Orphans: savedReport.orphans,
          Divorced: savedReport.divorced,
          Disable: savedReport.disable,
          Indegent: savedReport.indegent,
        },
      };
    } catch (error) {
      throw new BadRequestException(
        "Failed to create marriage gift report: " + error.message,
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

      const queryBuilder = this.marriageGiftReportRepository
        .createQueryBuilder("report")
        .where({ is_archived: false })
        .orderBy(`report.${sortField}`, sortOrder)
        .skip(skip)
        .take(pageSize);

      const reports = await queryBuilder.getMany();
      const total = await this.marriageGiftReportRepository.count({
        where: { is_archived: false },
      });
      const totalPages = Math.ceil(total / pageSize);

      const formattedReports = reports.map((report) => ({
        id: report.id,
        date: report.report_date,
        gifts: {
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
        "Failed to fetch marriage gift reports: " + error.message,
      );
    }
  }

  async findOne(id: number): Promise<any> {
    try {
      const report = await this.marriageGiftReportRepository.findOne({
        where: { id, is_archived: false },
      });

      if (!report) {
        throw new NotFoundException(
          `Marriage gift report with ID ${id} not found`,
        );
      }

      return {
        id: report.id,
        date: report.report_date,
        gifts: {
          Orphans: report.orphans,
          Divorced: report.divorced,
          Disable: report.disable,
          Indegent: report.indegent,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        "Failed to fetch marriage gift report: " + error.message,
      );
    }
  }

  async update(
    id: number,
    updateMarriageGiftReportDto: UpdateMarriageGiftReportDto,
  ): Promise<any> {
    try {
      const report = await this.marriageGiftReportRepository.findOne({
        where: { id, is_archived: false },
      });
      if (!report) {
        throw new NotFoundException(
          `Marriage gift report with ID ${id} not found`,
        );
      }

      await this.marriageGiftReportRepository.update(
        id,
        updateMarriageGiftReportDto,
      );

      return this.findOne(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        "Failed to update marriage gift report: " + error.message,
      );
    }
  }

  async remove(id: number): Promise<void> {
    try {
      const report = await this.marriageGiftReportRepository.findOne({
        where: { id, is_archived: false },
      });
      if (!report) {
        throw new NotFoundException(
          `Marriage gift report with ID ${id} not found`,
        );
      }
      await this.marriageGiftReportRepository.update(id, { is_archived: true });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        "Failed to delete marriage gift report: " + error.message,
      );
    }
  }
}
