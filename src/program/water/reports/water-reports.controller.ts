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
import { WaterReportsService } from "./water-reports.service";
import { CreateWaterReportDto } from "./dto/create-water-report.dto";
import { UpdateWaterReportDto } from "./dto/update-water-report.dto";
import { JwtGuard } from "src/auth/jwt.guard";
import { CurrentUser } from "src/auth/current-user.decorator";
import { User } from "src/users/user.entity";
import { PermissionsGuard } from "src/permissions/guards/permissions.guard";
import { RequiredPermissions } from "src/permissions/decorators/require-permission.decorator";

@Controller("program/water/reports")
@UseGuards(JwtGuard, PermissionsGuard)
export class WaterReportsController {
  constructor(private readonly waterReportsService: WaterReportsService) {}

  @Post()
  @RequiredPermissions([
    "program.water_reports.create",
    "super_admin",
    "programs_manager",
  ])
  async create(
    @Body() createDto: CreateWaterReportDto,
    @Res() res: Response,
    @CurrentUser() user: User,
  ) {
    try {
      const report = await this.waterReportsService.create(createDto, user);
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: "Water report created successfully",
        data: {
          id: report.id,
          date: report.date,
          activity: report.activity,
          system: report.system,
          quantity: report.quantity,
        },
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message || "Failed to create water report",
      });
    }
  }

  @Post("multiple")
  async createMultiple(
    @Body() createDtos: CreateWaterReportDto[],
    @Res() res: Response,
  ) {
    try {
      const reports = await this.waterReportsService.createMultiple(createDtos);
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: "Water reports created successfully",
        data: reports.map((report) => ({
          id: report.id,
          date: report.date,
          activity: report.activity,
          system: report.system,
          quantity: report.quantity,
        })),
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message || "Failed to create water reports",
      });
    }
  }

  @Get()
  @RequiredPermissions([
    "program.water_reports.list_view",
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

      const result = await this.waterReportsService.findAll(
        pageNum,
        pageSizeNum,
        sortField,
        sortOrder,
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Water reports retrieved successfully",
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
    "program.water_reports.view",
    "super_admin",
    "programs_manager",
    "read_only_super_admin",
  ])
  async findOne(@Param("id") id: string, @Res() res: Response) {
    try {
      const report = await this.waterReportsService.findOne(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: {
          id: report.id,
          date: report.date,
          activity: report.activity,
          system: report.system,
          quantity: report.quantity,
        },
      });
    } catch (error) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: error.message || "Water report not found",
      });
    }
  }

  @Get("date/:date")
  @RequiredPermissions([
    "program.water_reports.view",
    "super_admin",
    "programs_manager",
    "read_only_super_admin",
  ])
  async findByDate(@Param("date") date: string, @Res() res: Response) {
    try {
      const reports = await this.waterReportsService.findByDate(date);

      const activities = reports.map((report) => ({
        id: report.id,
        activity: report.activity,
        system: report.system,
        quantity: report.quantity,
      }));

      return res.status(HttpStatus.OK).json({
        success: true,
        data: {
          date: date,
          activities: activities,
        },
      });
    } catch (error) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: error.message || "Water reports not found for this date",
      });
    }
  }

  @Patch(":id")
  @RequiredPermissions([
    "program.water_reports.update",
    "super_admin",
    "programs_manager",
  ])
  async update(
    @Param("id") id: string,
    @Body() updateDto: UpdateWaterReportDto,
    @Res() res: Response,
  ) {
    try {
      const report = await this.waterReportsService.update(+id, updateDto);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Water report updated successfully",
        data: {
          id: report.id,
          date: report.date,
          activity: report.activity,
          system: report.system,
          quantity: report.quantity,
        },
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message || "Failed to update water report",
      });
    }
  }

  @Delete(":id")
  @RequiredPermissions([
    "program.water_reports.delete",
    "super_admin",
    "programs_manager",
  ])
  async remove(@Param("id") id: string, @Res() res: Response) {
    try {
      await this.waterReportsService.remove(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Water report deleted successfully",
      });
    } catch (error) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: error.message || "Failed to delete water report",
      });
    }
  }

  @Delete("date/:date")
  @RequiredPermissions([
    "program.water_reports.delete",
    "super_admin",
    "programs_manager",
  ])
  async removeByDate(@Param("date") date: string, @Res() res: Response) {
    try {
      await this.waterReportsService.removeByDate(date);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Water reports deleted successfully for this date",
      });
    } catch (error) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message:
          error.message || "Failed to delete water reports for this date",
      });
    }
  }
}
