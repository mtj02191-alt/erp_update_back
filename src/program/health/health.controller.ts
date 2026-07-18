import {
  Body,
  Controller,
  Delete,
  Get,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import { HealthService } from "./health.service";
import { CreateHealthDto } from "./dto/create-health.dto";
import { UpdateHealthDto } from "./dto/update-health.dto";
import { HealthTotalsQueryDto } from "./dto/health-totals-query.dto";
import { JwtGuard } from "src/auth/jwt.guard";
import { PermissionsGuard } from "src/permissions/guards/permissions.guard";
import { RequiredPermissions } from "src/permissions/decorators/require-permission.decorator";
import { CurrentUser } from "src/auth/current-user.decorator";
import { User } from "src/users/user.entity";

@Controller("program/health/reports")
@UseGuards(JwtGuard, PermissionsGuard)
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Post()
  @RequiredPermissions([
    "program.health_reports.create",
    "super_admin",
    "programs_manager",
  ])
  async create(
    @Body() createDto: CreateHealthDto,
    @Res() res: Response,
    @CurrentUser() user: User,
  ) {
    try {
      const report = await this.healthService.create(createDto, user);
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: "Health report created successfully",
        data: report,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message || "Failed to create health report",
      });
    }
  }

  @Post("multiple")
  @RequiredPermissions([
    "program.health_reports.create",
    "super_admin",
    "programs_manager",
  ])
  async createMultiple(
    @Body() createDtos: CreateHealthDto[],
    @Res() res: Response,
  ) {
    try {
      const reports = await this.healthService.createMultiple(createDtos);
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: "Health reports created successfully",
        data: reports.map((report) => ({
          id: report.id,
          date: report.date,
          type: report.type,
          vulnerabilities: {
            Widows: report.widows,
            Divorced: report.divorced,
            Disable: report.disable,
            Indegent: report.indegent,
            Orphans: report.orphans,
          },
        })),
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message || "Failed to create health reports",
      });
    }
  }

  @Get()
  @RequiredPermissions([
    "program.health_reports.list_view",
    "super_admin",
    "programs_manager",
    "read_only_super_admin",
  ])
  async findAll(
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("sortField") sortField?: string,
    @Query("sortOrder") sortOrder?: "ASC" | "DESC",
    @Res() res?: Response,
  ) {
    try {
      const pageNum = page ? parseInt(page) : 1;
      const pageSizeNum = pageSize ? parseInt(pageSize) : 10;

      const result = await this.healthService.findAll(
        pageNum,
        pageSizeNum,
        sortField,
        sortOrder,
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Health reports retrieved successfully",
        ...result,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: [],
        pagination: null,
      });
    }
  }

  /**
   * GET /program/health/reports/type-totals?from=YYYY-MM-DD&to=YYYY-MM-DD
   * Returns totals grouped by report `type` (Medicines, Ambulance, ...).
   */
  @Get("type-totals")
  @RequiredPermissions([
    "program.health_reports.list_view",
    "super_admin",
    "programs_manager",
    "read_only_super_admin",
  ])
  async getTypeTotals(
    @Query() query: HealthTotalsQueryDto,
    @Res() res: Response,
  ) {
    try {
      const data = await this.healthService.getTotalsByType(
        query.from,
        query.to,
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Health totals by type retrieved successfully",
        data,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message || "Failed to fetch health totals by type",
        data: null,
      });
    }
  }

  @Get(":id")
  @RequiredPermissions([
    "program.health_reports.view",
    "super_admin",
    "programs_manager",
    "read_only_super_admin",
  ])
  async findOne(@Param("id") id: string, @Res() res: Response) {
    try {
      const report = await this.healthService.findOne(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: {
          id: report.id,
          date: report.date,
          type: report.type,
          vulnerabilities: {
            Widows: report.widows,
            Divorced: report.divorced,
            Disable: report.disable,
            Indegent: report.indegent,
            Orphans: report.orphans,
          },
        },
      });
    } catch (error) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: error.message || "Health report not found",
      });
    }
  }

  @Get("date/:date")
  @RequiredPermissions([
    "program.health_reports.view",
    "super_admin",
    "programs_manager",
    "read_only_super_admin",
  ])
  async findByDate(@Param("date") date: string, @Res() res: Response) {
    try {
      const reports = await this.healthService.findByDate(date);

      const distributions = reports.map((report) => ({
        id: report.id,
        type: report.type,
        vulnerabilities: {
          Widows: report.widows,
          Divorced: report.divorced,
          Disable: report.disable,
          Indegent: report.indegent,
          Orphans: report.orphans,
        },
      }));

      return res.status(HttpStatus.OK).json({
        success: true,
        data: {
          date,
          distributions,
        },
      });
    } catch (error) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: error.message || "Health reports not found for this date",
      });
    }
  }

  @Patch(":id")
  @RequiredPermissions([
    "program.health_reports.update",
    "super_admin",
    "programs_manager",
  ])
  async update(
    @Param("id") id: string,
    @Body() updateDto: UpdateHealthDto,
    @Res() res: Response,
  ) {
    try {
      const report = await this.healthService.update(+id, updateDto);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Health report updated successfully",
        data: {
          id: report.id,
          date: report.date,
          type: report.type,
          vulnerabilities: {
            Widows: report.widows,
            Divorced: report.divorced,
            Disable: report.disable,
            Indegent: report.indegent,
            Orphans: report.orphans,
          },
        },
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message || "Failed to update health report",
      });
    }
  }

  @Delete(":id")
  @RequiredPermissions([
    "program.health_reports.delete",
    "super_admin",
    "programs_manager",
  ])
  async remove(@Param("id") id: string, @Res() res: Response) {
    try {
      await this.healthService.remove(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Health report deleted successfully",
      });
    } catch (error) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: error.message || "Failed to delete health report",
      });
    }
  }

  @Delete("date/:date")
  @RequiredPermissions([
    "program.health_reports.delete",
    "super_admin",
    "programs_manager",
  ])
  async removeByDate(@Param("date") date: string, @Res() res: Response) {
    try {
      await this.healthService.removeByDate(date);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Health reports deleted successfully for this date",
      });
    } catch (error) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message:
          error.message || "Failed to delete health reports for this date",
      });
    }
  }
}
