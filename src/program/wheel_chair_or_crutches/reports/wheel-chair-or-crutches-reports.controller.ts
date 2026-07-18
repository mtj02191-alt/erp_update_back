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
import { WheelChairOrCrutchesReportsService } from "./wheel-chair-or-crutches-reports.service";
import { CreateWheelChairOrCrutchesReportDto } from "./dto/create-wheel-chair-or-crutches-report.dto";
import { UpdateWheelChairOrCrutchesReportDto } from "./dto/update-wheel-chair-or-crutches-report.dto";
import { JwtGuard } from "src/auth/jwt.guard";
import { CurrentUser } from "src/auth/current-user.decorator";
import { User } from "src/users/user.entity";
import { PermissionsGuard } from "src/permissions/guards/permissions.guard";
import { RequiredPermissions } from "src/permissions/decorators/require-permission.decorator";

@Controller("program/wheel_chair_or_crutches/reports")
@UseGuards(JwtGuard, PermissionsGuard)
export class WheelChairOrCrutchesReportsController {
  constructor(
    private readonly wheelChairOrCrutchesReportsService: WheelChairOrCrutchesReportsService,
  ) {}

  @Post()
  @RequiredPermissions([
    "program.wheel_chair_or_crutches_reports.create",
    "super_admin",
    "programs_manager",
  ])
  async create(
    @Body() createDto: CreateWheelChairOrCrutchesReportDto,
    @Res() res: Response,
    @CurrentUser() user: User,
  ) {
    try {
      const report = await this.wheelChairOrCrutchesReportsService.create(
        createDto,
        user,
      );
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: "Wheel chair or crutches report created successfully",
        data: report,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message:
          error.message || "Failed to create wheel chair or crutches report",
      });
    }
  }

  @Post("multiple")
  async createMultiple(
    @Body() createDtos: CreateWheelChairOrCrutchesReportDto[],
    @Res() res: Response,
  ) {
    try {
      const reports =
        await this.wheelChairOrCrutchesReportsService.createMultiple(
          createDtos,
        );
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: "Wheel chair or crutches reports created successfully",
        data: reports.map((report) => ({
          id: report.id,
          date: report.date,
          type: report.type,
          gender: report.gender,
          vulnerabilities: {
            Orphans: report.orphans,
            Divorced: report.divorced,
            Disable: report.disable,
            Indegent: report.indegent,
          },
        })),
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message:
          error.message || "Failed to create wheel chair or crutches reports",
      });
    }
  }

  @Get()
  @RequiredPermissions([
    "program.wheel_chair_or_crutches_reports.list_view",
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

      const result = await this.wheelChairOrCrutchesReportsService.findAll(
        pageNum,
        pageSizeNum,
        sortField,
        sortOrder,
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Wheel chair or crutches reports retrieved successfully",
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
    "program.wheel_chair_or_crutches_reports.view",
    "super_admin",
    "programs_manager",
    "read_only_super_admin",
  ])
  async findOne(@Param("id") id: string, @Res() res: Response) {
    try {
      const report = await this.wheelChairOrCrutchesReportsService.findOne(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: {
          id: report.id,
          date: report.date,
          type: report.type,
          gender: report.gender,
          vulnerabilities: {
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
        message: error.message || "Wheel chair or crutches report not found",
      });
    }
  }

  @Get("date/:date")
  @RequiredPermissions([
    "program.wheel_chair_or_crutches_reports.view",
    "super_admin",
    "programs_manager",
    "read_only_super_admin",
  ])
  async findByDate(@Param("date") date: string, @Res() res: Response) {
    try {
      const reports =
        await this.wheelChairOrCrutchesReportsService.findByDate(date);

      const distributions = reports.map((report) => ({
        id: report.id,
        type: report.type,
        gender: report.gender,
        vulnerabilities: {
          Orphans: report.orphans,
          Divorced: report.divorced,
          Disable: report.disable,
          Indegent: report.indegent,
        },
      }));

      return res.status(HttpStatus.OK).json({
        success: true,
        data: {
          date: date,
          distributions: distributions,
        },
      });
    } catch (error) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message:
          error.message ||
          "Wheel chair or crutches reports not found for this date",
      });
    }
  }

  @Patch(":id")
  @RequiredPermissions([
    "program.wheel_chair_or_crutches_reports.update",
    "super_admin",
    "programs_manager",
  ])
  async update(
    @Param("id") id: string,
    @Body() updateDto: UpdateWheelChairOrCrutchesReportDto,
    @Res() res: Response,
  ) {
    try {
      const report = await this.wheelChairOrCrutchesReportsService.update(
        +id,
        updateDto,
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Wheel chair or crutches report updated successfully",
        data: {
          id: report.id,
          date: report.date,
          type: report.type,
          gender: report.gender,
          vulnerabilities: {
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
        message:
          error.message || "Failed to update wheel chair or crutches report",
      });
    }
  }

  @Delete(":id")
  @RequiredPermissions([
    "program.wheel_chair_or_crutches_reports.delete",
    "super_admin",
    "programs_manager",
  ])
  async remove(@Param("id") id: string, @Res() res: Response) {
    try {
      await this.wheelChairOrCrutchesReportsService.remove(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Wheel chair or crutches report deleted successfully",
      });
    } catch (error) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message:
          error.message || "Failed to delete wheel chair or crutches report",
      });
    }
  }

  @Delete("date/:date")
  @RequiredPermissions([
    "program.wheel_chair_or_crutches_reports.delete",
    "super_admin",
    "programs_manager",
  ])
  async removeByDate(@Param("date") date: string, @Res() res: Response) {
    try {
      await this.wheelChairOrCrutchesReportsService.removeByDate(date);
      return res.status(HttpStatus.OK).json({
        success: true,
        message:
          "Wheel chair or crutches reports deleted successfully for this date",
      });
    } catch (error) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message:
          error.message ||
          "Failed to delete wheel chair or crutches reports for this date",
      });
    }
  }
}
