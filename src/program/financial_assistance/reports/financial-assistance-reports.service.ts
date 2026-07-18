import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { FinancialAssistanceReport } from "./entities/financial-assistance-report.entity";
import { CreateFinancialAssistanceReportDto } from "./dto/create-financial-assistance-report.dto";
import { UpdateFinancialAssistanceReportDto } from "./dto/update-financial-assistance-report.dto";
import { User } from "../../../users/user.entity";

@Injectable()
export class FinancialAssistanceReportsService {
  constructor(
    @InjectRepository(FinancialAssistanceReport)
    private financialAssistanceReportRepository: Repository<FinancialAssistanceReport>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(
    createDto: CreateFinancialAssistanceReportDto,
    user: User,
  ): Promise<any> {
    try {
      const dbUser = await this.userRepository.findOne({
        where: { id: user.id },
      });
      const report = this.financialAssistanceReportRepository.create({
        ...createDto,
        created_by: dbUser,
        updated_by: dbUser,
      });
      const saved = await this.financialAssistanceReportRepository.save(report);
      return {
        id: saved.id,
        date: saved.report_date,
        assistance: {
          Widow: saved.widow,
          Divorced: saved.divorced,
          Disable: saved.disable,
          "Extreme Poor": saved.extreme_poor,
        },
      };
    } catch (error) {
      throw new BadRequestException(
        "Failed to create financial assistance report: " + error.message,
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
      const queryBuilder = this.financialAssistanceReportRepository
        .createQueryBuilder("report")
        .where({ is_archived: false })
        .orderBy(`report.${sortField}`, sortOrder)
        .skip(skip)
        .take(pageSize);
      const reports = await queryBuilder.getMany();
      const total = await this.financialAssistanceReportRepository.count({
        where: { is_archived: false },
      });
      const totalPages = Math.ceil(total / pageSize);
      const formattedReports = reports.map((report) => ({
        id: report.id,
        date: report.report_date,
        assistance: {
          Widow: report.widow,
          Divorced: report.divorced,
          Disable: report.disable,
          "Extreme Poor": report.extreme_poor,
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
        "Failed to fetch financial assistance reports: " + error.message,
      );
    }
  }

  async findOne(id: number): Promise<any> {
    try {
      const report = await this.financialAssistanceReportRepository.findOne({
        where: { id, is_archived: false },
      });
      if (!report) {
        throw new NotFoundException(
          `Financial assistance report with ID ${id} not found`,
        );
      }
      return {
        id: report.id,
        date: report.report_date,
        assistance: {
          Widow: report.widow,
          Divorced: report.divorced,
          Disable: report.disable,
          "Extreme Poor": report.extreme_poor,
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        "Failed to fetch financial assistance report: " + error.message,
      );
    }
  }

  async update(
    id: number,
    updateDto: UpdateFinancialAssistanceReportDto,
  ): Promise<any> {
    try {
      const report = await this.findOne(id);
      await this.financialAssistanceReportRepository.update(id, updateDto);
      return this.findOne(id);
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        "Failed to update financial assistance report: " + error.message,
      );
    }
  }

  async remove(id: number): Promise<void> {
    try {
      const report = await this.financialAssistanceReportRepository.findOne({
        where: { id, is_archived: false },
      });
      if (!report) {
        throw new NotFoundException(
          `Financial assistance report with ID ${id} not found`,
        );
      }
      await this.financialAssistanceReportRepository.update(id, {
        is_archived: true,
      });
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new BadRequestException(
        "Failed to delete financial assistance report: " + error.message,
      );
    }
  }
}
