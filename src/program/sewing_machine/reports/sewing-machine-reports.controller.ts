import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  Res,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import { SewingMachineReportsService } from "./sewing-machine-reports.service";
import { CreateSewingMachineReportDto } from "./dto/create-sewing-machine-report.dto";
import { UpdateSewingMachineReportDto } from "./dto/update-sewing-machine-report.dto";
import { JwtGuard } from "src/auth/jwt.guard";
import { CurrentUser } from "src/auth/current-user.decorator";
import { User } from "src/users/user.entity";
import { PermissionsGuard } from "src/permissions/guards/permissions.guard";
import { RequiredPermissions } from "src/permissions/decorators/require-permission.decorator";

@Controller("program/sewing_machine/reports")
@UseGuards(JwtGuard, PermissionsGuard)
export class SewingMachineReportsController {
  constructor(
    private readonly sewingMachineReportsService: SewingMachineReportsService,
  ) {}

  @Post()
  @RequiredPermissions([
    "program.sewing_machine_reports.create",
    "super_admin",
    "programs_manager",
  ])
  async create(
    @Body() createDto: CreateSewingMachineReportDto,
    @Res() res: Response,
    @CurrentUser() user: User,
  ) {
    try {
      const report = await this.sewingMachineReportsService.create(
        createDto,
        user,
      );
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: "Sewing machine report created successfully",
        data: {
          id: report.id,
          date: report.date,
          assistance: {
            Orphans: report.orphans,
            Divorced: report.divorced,
            Disable: report.disable,
            Indegent: report.indegent,
          },
        },
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message || "Failed to create sewing machine report",
      });
    }
  }

  @Get()
  @RequiredPermissions([
    "program.sewing_machine_reports.list_view",
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

      const result = await this.sewingMachineReportsService.findAll(
        pageNum,
        pageSizeNum,
        sortField,
        sortOrder,
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Sewing machine reports retrieved successfully",
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

  @Get(":id")
  @RequiredPermissions([
    "program.sewing_machine_reports.view",
    "super_admin",
    "programs_manager",
    "read_only_super_admin",
  ])
  async findOne(@Param("id") id: string, @Res() res: Response) {
    try {
      const report = await this.sewingMachineReportsService.findOne(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: {
          id: report.id,
          date: report.date,
          assistance: {
            Orphans: report.orphans,
            Divorced: report.divorced,
            Disable: report.disable,
            Indegent: report.indegent,
          },
        },
      });
    } catch (error) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: error.message || "Sewing machine report not found",
      });
    }
  }

  @Patch(":id")
  @RequiredPermissions([
    "program.sewing_machine_reports.update",
    "super_admin",
    "programs_manager",
  ])
  async update(
    @Param("id") id: string,
    @Body() updateDto: UpdateSewingMachineReportDto,
    @Res() res: Response,
  ) {
    try {
      const report = await this.sewingMachineReportsService.update(
        +id,
        updateDto,
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Sewing machine report updated successfully",
        data: {
          id: report.id,
          date: report.date,
          assistance: {
            Orphans: report.orphans,
            Divorced: report.divorced,
            Disable: report.disable,
            Indegent: report.indegent,
          },
        },
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message || "Failed to update sewing machine report",
      });
    }
  }

  @Delete(":id")
  @RequiredPermissions([
    "program.sewing_machine_reports.delete",
    "super_admin",
    "programs_manager",
  ])
  async remove(@Param("id") id: string, @Res() res: Response) {
    try {
      await this.sewingMachineReportsService.remove(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Sewing machine report deleted successfully",
      });
    } catch (error) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: error.message || "Failed to delete sewing machine report",
      });
    }
  }
}
