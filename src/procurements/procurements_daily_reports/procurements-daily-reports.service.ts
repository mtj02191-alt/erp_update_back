import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ProcurementsDailyReportEntity } from "./entities/procurements-daily-report.entity";
import { CreateProcurementsDailyReportDto } from "./dto/create-procurements-daily-report.dto";
import { UpdateProcurementsDailyReportDto } from "./dto/update-procurements-daily-report.dto";
import { User } from "../../users/user.entity";

@Injectable()
export class ProcurementsDailyReportsService {
  private readonly logger = new Logger(ProcurementsDailyReportsService.name);

  constructor(
    @InjectRepository(ProcurementsDailyReportEntity)
    private readonly procurementsDailyReportRepository: Repository<ProcurementsDailyReportEntity>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(
    reportInfo: CreateProcurementsDailyReportDto,
    user: User,
  ): Promise<ProcurementsDailyReportEntity> {
    try {
      this.logger.log(
        `Creating new procurements daily report for date: ${reportInfo.date}`,
      );
      const userData = await this.userRepository.findOne({
        where: { id: user.id },
      });
      // Check if report already exists for the same date
      const existingReport =
        await this.procurementsDailyReportRepository.findOne({
          where: { date: reportInfo.date, is_archived: false },
        });

      if (existingReport) {
        throw new ForbiddenException("A report for this date already exists");
      }
      reportInfo.created_by = userData;
      const report = this.procurementsDailyReportRepository.create(reportInfo);
      const savedReport =
        await this.procurementsDailyReportRepository.save(report);

      this.logger.log(
        `Successfully created procurements daily report with ID: ${savedReport.id}`,
      );
      return savedReport;
    } catch (error) {
      this.logger.error(
        `Error creating procurements daily report: ${error.message}`,
        error.stack,
      );
      if (error instanceof ForbiddenException) {
        throw error;
      }
      throw new Error("Failed to create procurements daily report");
    }
  }

  async findAll(
    page: number = 1,
    pageSize: number = 10,
    sortField: string = "date",
    sortOrder: "ASC" | "DESC" = "DESC",
    userRole?: string,
  ): Promise<{ data: ProcurementsDailyReportEntity[]; pagination: any }> {
    try {
      this.logger.log(
        `Fetching procurements daily reports - Page: ${page}, Size: ${pageSize}, Sort: ${sortField} ${sortOrder}`,
      );

      const skip = (page - 1) * pageSize;

      const [reports, total] =
        await this.procurementsDailyReportRepository.findAndCount({
          where: { is_archived: false },
          skip,
          take: pageSize,
          order: { [sortField]: sortOrder },
        });

      const totalPages = Math.ceil(total / pageSize);

      this.logger.log(
        `Successfully fetched ${reports.length} reports out of ${total} total`,
      );

      return {
        data: reports,
        pagination: {
          total,
          page,
          pageSize,
          totalPages,
        },
      };
    } catch (error) {
      this.logger.error(
        `Error fetching procurements daily reports: ${error.message}`,
        error.stack,
      );
      throw new Error("Failed to fetch procurements daily reports");
    }
  }

  async findOne(
    id: number,
    userRole?: string,
  ): Promise<ProcurementsDailyReportEntity> {
    try {
      this.logger.log(`Fetching procurements daily report with ID: ${id}`);

      const report = await this.procurementsDailyReportRepository.findOne({
        where: { id, is_archived: false },
      });

      if (!report) {
        throw new NotFoundException(
          `Procurements daily report with ID ${id} not found`,
        );
      }

      this.logger.log(
        `Successfully fetched procurements daily report with ID: ${id}`,
      );
      return report;
    } catch (error) {
      this.logger.error(
        `Error fetching procurements daily report with ID ${id}: ${error.message}`,
        error.stack,
      );
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error("Failed to fetch procurements daily report");
    }
  }

  async update(
    id: number,
    updateDto: UpdateProcurementsDailyReportDto,
    userRole?: string,
  ): Promise<ProcurementsDailyReportEntity> {
    try {
      this.logger.log(`Updating procurements daily report with ID: ${id}`);

      const report = await this.procurementsDailyReportRepository.findOne({
        where: { id, is_archived: false },
      });

      if (!report) {
        throw new NotFoundException(
          `Procurements daily report with ID ${id} not found`,
        );
      }

      // If date is being updated, check for conflicts
      if (updateDto.date && updateDto.date !== report.date) {
        const existingReport =
          await this.procurementsDailyReportRepository.findOne({
            where: { date: updateDto.date, is_archived: false },
          });

        if (existingReport && existingReport.id !== id) {
          throw new ForbiddenException("A report for this date already exists");
        }
      }

      Object.assign(report, updateDto);
      const updatedReport =
        await this.procurementsDailyReportRepository.save(report);

      this.logger.log(
        `Successfully updated procurements daily report with ID: ${id}`,
      );
      return updatedReport;
    } catch (error) {
      this.logger.error(
        `Error updating procurements daily report with ID ${id}: ${error.message}`,
        error.stack,
      );
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new Error("Failed to update procurements daily report");
    }
  }

  async remove(id: number, userRole?: string): Promise<void> {
    try {
      this.logger.log(`Deleting procurements daily report with ID: ${id}`);

      const report = await this.procurementsDailyReportRepository.findOne({
        where: { id, is_archived: false },
      });

      if (!report) {
        throw new NotFoundException(
          `Procurements daily report with ID ${id} not found`,
        );
      }

      await this.procurementsDailyReportRepository.update(id, {
        is_archived: true,
      });

      this.logger.log(
        `Successfully deleted procurements daily report with ID: ${id}`,
      );
    } catch (error) {
      this.logger.error(
        `Error deleting procurements daily report with ID ${id}: ${error.message}`,
        error.stack,
      );
      if (error instanceof NotFoundException) {
        throw error;
      }
      throw new Error("Failed to delete procurements daily report");
    }
  }
}
