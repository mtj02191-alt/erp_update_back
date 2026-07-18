import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Query,
  Res,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import { KasbReportsService } from "./kasb-reports.service";
import { CreateKasbReportDto } from "./dto/create-kasb-report.dto";
import { JwtGuard } from "src/auth/jwt.guard";
import { CurrentUser } from "src/auth/current-user.decorator";
import { User } from "src/users/user.entity";
import { PermissionsGuard } from "src/permissions/guards/permissions.guard";
import { RequiredPermissions } from "src/permissions/decorators/require-permission.decorator";

@Controller("program/kasb/reports")
@UseGuards(JwtGuard, PermissionsGuard)
export class KasbReportsController {
  constructor(private readonly kasbReportsService: KasbReportsService) {}

  @Post()
  @RequiredPermissions([
    "program.kasb_reports.create",
    "super_admin",
    "programs_manager",
  ])
  async create(
    @Body() createDto: CreateKasbReportDto,
    @Res() res: Response,
    @CurrentUser() user: User,
  ) {
    try {
      const report = await this.kasbReportsService.create(createDto, user);
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: "Kasb report created successfully",
        data: {
          id: report.id,
          date: report.date,
          center: report.center,
          delivery: report.delivery,
        },
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message || "Failed to create kasb report",
      });
    }
  }

  @Post("multiple")
  async createMultiple(
    @Body() createDtos: CreateKasbReportDto[],
    @Res() res: Response,
  ) {
    try {
      const reports = await this.kasbReportsService.createMultiple(createDtos);
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: "Kasb reports created successfully",
        data: reports.map((report) => ({
          id: report.id,
          date: report.date,
          center: report.center,
          delivery: report.delivery,
        })),
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message || "Failed to create kasb reports",
      });
    }
  }

  @Get()
  @RequiredPermissions([
    "program.kasb_reports.list_view",
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

      const result = await this.kasbReportsService.findAll(
        pageNum,
        pageSizeNum,
        sortField,
        sortOrder,
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Kasb reports retrieved successfully",
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
    "program.kasb_reports.view",
    "super_admin",
    "programs_manager",
    "read_only_super_admin",
  ])
  async findOne(@Param("id") id: string, @Res() res: Response) {
    try {
      const report = await this.kasbReportsService.findOne(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: {
          id: report.id,
          date: report.date,
          center: report.center,
          delivery: report.delivery,
        },
      });
    } catch (error) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: error.message || "Kasb report not found",
      });
    }
  }

  @Get("date/:date")
  @RequiredPermissions([
    "program.kasb_reports.view",
    "super_admin",
    "programs_manager",
    "read_only_super_admin",
  ])
  async findByDate(@Param("date") date: string, @Res() res: Response) {
    try {
      const reports = await this.kasbReportsService.findByDate(date);

      const centers = reports.map((report) => ({
        id: report.id,
        center: report.center,
        delivery: report.delivery,
      }));

      return res.status(HttpStatus.OK).json({
        success: true,
        data: {
          date: date,
          centers: centers,
        },
      });
    } catch (error) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: error.message || "Kasb reports not found for this date",
      });
    }
  }

  @Delete(":id")
  @RequiredPermissions([
    "program.kasb_reports.delete",
    "super_admin",
    "programs_manager",
  ])
  async remove(@Param("id") id: string, @Res() res: Response) {
    try {
      await this.kasbReportsService.remove(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Kasb report deleted successfully",
      });
    } catch (error) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: error.message || "Failed to delete kasb report",
      });
    }
  }

  @Delete("date/:date")
  async removeByDate(@Param("date") date: string, @Res() res: Response) {
    try {
      await this.kasbReportsService.removeByDate(date);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Kasb reports deleted successfully for this date",
      });
    } catch (error) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: error.message || "Failed to delete kasb reports for this date",
      });
    }
  }
}
