import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  InternalServerErrorException,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { StoreDailyReportEntity } from "./entities/store-daily-report.entity";
import { CreateStoreDailyReportDto } from "./dto/create-store-daily-report.dto";
import { UpdateStoreDailyReportDto } from "./dto/update-store-daily-report.dto";
import { User, UserRole } from "../../users/user.entity";

interface PaginationOptions {
  page: number;
  pageSize: number;
  sortField: string;
  sortOrder: "ASC" | "DESC";
}

@Injectable()
export class StoreDailyReportsService {
  constructor(
    @InjectRepository(StoreDailyReportEntity)
    private storeDailyReportRepository: Repository<StoreDailyReportEntity>,
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async create(
    createStoreDailyReportDto: CreateStoreDailyReportDto,
    user: User,
  ) {
    try {
      const dbuser = await this.userRepository.findOne({
        where: { id: user.id },
      });
      // Map camelCase DTO fields to snake_case entity fields
      const report = this.storeDailyReportRepository.create({
        date: createStoreDailyReportDto.date,
        generated_demands: createStoreDailyReportDto.generated_demands,
        pending_demands: createStoreDailyReportDto.pending_demands,
        generated_grn: createStoreDailyReportDto.generated_grn,
        pending_grn: createStoreDailyReportDto.pending_grn,
        rejected_demands: createStoreDailyReportDto.rejected_demands,
        created_by: dbuser,
      });
      return await this.storeDailyReportRepository.save(report);
    } catch (error) {
      console.error("Error creating store daily report:", error);
      if (error.code === "23505") {
        // Unique constraint violation
        throw new BadRequestException("A report for this date already exists");
      }
      if (error.code === "23503") {
        // Foreign key constraint violation
        throw new BadRequestException("Invalid user reference");
      }
      throw new InternalServerErrorException(
        "Failed to create store daily report",
      );
    }
  }

  async findAll(user: any, options: PaginationOptions) {
    try {
      const { page, pageSize, sortField, sortOrder } = options;
      const queryBuilder = this.storeDailyReportRepository
        .createQueryBuilder("report")
        // .leftJoinAndSelect('report.user', 'user')
        .orderBy(`report.${sortField}`, sortOrder)
        .skip((page - 1) * pageSize)
        .take(pageSize);

      // If user is not admin, only show their reports
      if (user.role !== UserRole.ADMIN) {
        queryBuilder.where("report.created_by.id = :userId", {
          userId: user.id,
        });
      }

      const [reports, total] = await queryBuilder.getManyAndCount();

      return {
        data: reports,
        pagination: {
          total,
          page,
          pageSize,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (error) {
      console.error("Error fetching store daily reports:", error);
      throw new InternalServerErrorException(
        "Failed to fetch store daily reports",
      );
    }
  }

  async findOne(id: number, user: User) {
    try {
      const report = await this.storeDailyReportRepository.findOne({
        where: { id },
        // relations: ['user'],
      });

      if (!report) {
        throw new NotFoundException(
          `Store daily report with ID ${id} not found`,
        );
      }

      // Check if user has permission to view this report
      // if (user.role !== UserRole.ADMIN && report.created_by !== user.id) {
      //   throw new ForbiddenException('You do not have permission to view this report');
      // }

      return report;
    } catch (error) {
      console.error(`Error fetching store daily report with ID ${id}:`, error);
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        "Failed to fetch store daily report",
      );
    }
  }

  async update(
    id: number,
    updateStoreDailyReportDto: UpdateStoreDailyReportDto,
    user: User,
  ) {
    try {
      const report = await this.findOne(id, user);

      // Check if user has permission to update this report
      // if (user.role !== UserRole.ADMIN && report.created_by !== user.id) {
      //   throw new ForbiddenException('You do not have permission to update this report');
      // }

      // Map camelCase DTO fields to snake_case entity fields
      if (updateStoreDailyReportDto.date !== undefined)
        report.date = updateStoreDailyReportDto.date;
      if (updateStoreDailyReportDto.demandGenerated !== undefined)
        report.generated_demands = updateStoreDailyReportDto.demandGenerated;
      if (updateStoreDailyReportDto.pendingDemands !== undefined)
        report.pending_demands = updateStoreDailyReportDto.pendingDemands;
      if (updateStoreDailyReportDto.generatedGRN !== undefined)
        report.generated_grn = updateStoreDailyReportDto.generatedGRN;
      if (updateStoreDailyReportDto.pendingGRN !== undefined)
        report.pending_grn = updateStoreDailyReportDto.pendingGRN;
      if (updateStoreDailyReportDto.rejectedDemands !== undefined)
        report.rejected_demands = updateStoreDailyReportDto.rejectedDemands;

      return await this.storeDailyReportRepository.save(report);
    } catch (error) {
      console.error(`Error updating store daily report with ID ${id}:`, error);
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      if (error.code === "23505") {
        // Unique constraint violation
        throw new BadRequestException("A report for this date already exists");
      }
      throw new InternalServerErrorException(
        "Failed to update store daily report",
      );
    }
  }

  async remove(id: number, user: User) {
    try {
      const report = await this.findOne(id, user);

      // Check if user has permission to delete this report
      // if (user.role !== UserRole.ADMIN && report.created_by !== user.id) {
      //   throw new ForbiddenException('You do not have permission to delete this report');
      // }

      await this.storeDailyReportRepository.remove(report);
      return { message: "Store daily report deleted successfully" };
    } catch (error) {
      console.error(`Error deleting store daily report with ID ${id}:`, error);
      if (
        error instanceof NotFoundException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }
      throw new InternalServerErrorException(
        "Failed to delete store daily report",
      );
    }
  }
}
