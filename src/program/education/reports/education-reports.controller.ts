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
import { EducationReportsService } from "./education-reports.service";
import { CreateEducationReportDto } from "./dto/create-education-report.dto";
import { UpdateEducationReportDto } from "./dto/update-education-report.dto";
import { JwtGuard } from "src/auth/jwt.guard";
import { CurrentUser } from "src/auth/current-user.decorator";
import { User } from "src/users/user.entity";
import { PermissionsGuard } from "src/permissions/guards/permissions.guard";
import { RequiredPermissions } from "src/permissions/decorators/require-permission.decorator";

@Controller("program/education/reports")
@UseGuards(JwtGuard, PermissionsGuard)
export class EducationReportsController {
  constructor(
    private readonly educationReportsService: EducationReportsService,
  ) {}

  @Post()
  @RequiredPermissions([
    "program.education_reports.create",
    "super_admin",
    "programs_manager",
  ])
  async create(
    @Body() createEducationReportDto: CreateEducationReportDto,
    @CurrentUser() user: User,
  ) {
    try {
      return await this.educationReportsService.create(
        createEducationReportDto,
        user,
      );
    } catch (error) {
      return error.message;
    }
  }

  @Get()
  @RequiredPermissions([
    "program.education_reports.list_view",
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

      const result = await this.educationReportsService.findAll(
        pageNum,
        pageSizeNum,
        sortField,
        sortOrder,
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Education reports retrieved successfully",
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
    "program.education_reports.view",
    "super_admin",
    "programs_manager",
    "read_only_super_admin",
  ])
  async findOne(@Param("id") id: string, @Res() res: Response) {
    try {
      const report = await this.educationReportsService.findOne(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: report,
      });
    } catch (error) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: error.message || "Education report not found",
      });
    }
  }

  @Patch(":id")
  @RequiredPermissions([
    "program.education_reports.update",
    "super_admin",
    "programs_manager",
  ])
  async update(
    @Param("id") id: string,
    @Body() updateEducationReportDto: UpdateEducationReportDto,
    @Res() res: Response,
  ) {
    try {
      const report = await this.educationReportsService.update(
        +id,
        updateEducationReportDto,
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Education report updated successfully",
        data: report,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message || "Failed to update education report",
      });
    }
  }

  @Delete(":id")
  @RequiredPermissions([
    "program.education_reports.delete",
    "super_admin",
    "programs_manager",
  ])
  async remove(@Param("id") id: string, @Res() res: Response) {
    try {
      await this.educationReportsService.remove(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Education report deleted successfully",
      });
    } catch (error) {
      return res.status(HttpStatus.NOT_FOUND).json({
        success: false,
        message: error.message || "Failed to delete education report",
      });
    }
  }
}
