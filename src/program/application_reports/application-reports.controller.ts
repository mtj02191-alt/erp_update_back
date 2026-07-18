import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  HttpCode,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import { ApplicationReportsService } from "./application-reports.service";
import { CreateApplicationReportDto } from "./dto/create-application-report.dto";
import { UpdateApplicationReportDto } from "./dto/update-application-report.dto";
import { CurrentUser } from "../../auth/current-user.decorator";
import { User } from "../../users/user.entity";
import { JwtGuard } from "src/auth/jwt.guard";
import { PermissionsGuard } from "../../permissions/guards/permissions.guard";
import { RequiredPermissions } from "../../permissions/decorators/require-permission.decorator";

@Controller("program/application-reports")
@UseGuards(JwtGuard, PermissionsGuard)
export class ApplicationReportsController {
  constructor(
    private readonly applicationReportsService: ApplicationReportsService,
  ) {}

  @Post()
  @RequiredPermissions([
    "program.application_reports.create",
    "super_admin",
    "programs_manager",
  ])
  async create(
    @Body() createApplicationReportDto: CreateApplicationReportDto,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    try {
      const result = await this.applicationReportsService.create(
        createApplicationReportDto,
        user,
      );
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: "Application report created successfully",
        data: result,
      });
    } catch (error) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  @Get()
  @RequiredPermissions([
    "program.application_reports.list_view",
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

      const result = await this.applicationReportsService.findAll(
        pageNum,
        pageSizeNum,
        sortField,
        sortOrder,
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Application reports retrieved successfully",
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

  @Get("latest")
  @RequiredPermissions([
    "program.application_reports.view",
    "super_admin",
    "programs_manager",
    "read_only_super_admin",
  ])
  async findLatest(@Res() res: Response) {
    try {
      const result = await this.applicationReportsService.findLatest();
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Latest application report retrieved successfully",
        data: result,
      });
    } catch (error) {
      const status = error.message.includes("not found")
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  @Get(":id")
  @RequiredPermissions([
    "program.application_reports.view",
    "super_admin",
    "programs_manager",
    "read_only_super_admin",
  ])
  async findOne(@Param("id") id: string, @Res() res: Response) {
    try {
      const result = await this.applicationReportsService.findOne(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Application report retrieved successfully",
        data: result,
      });
    } catch (error) {
      const status = error.message.includes("not found")
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  @Patch(":id")
  @RequiredPermissions([
    "program.application_reports.update",
    "super_admin",
    "programs_manager",
  ])
  async update(
    @Param("id") id: string,
    @Body() updateApplicationReportDto: UpdateApplicationReportDto,
    @CurrentUser() user: User,
    @Res() res: Response,
  ) {
    try {
      const result = await this.applicationReportsService.update(
        +id,
        updateApplicationReportDto,
        user,
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Application report updated successfully",
        data: result,
      });
    } catch (error) {
      const status = error.message.includes("not found")
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  @Delete(":id")
  @RequiredPermissions([
    "program.application_reports.delete",
    "super_admin",
    "programs_manager",
  ])
  async remove(@Param("id") id: string, @Res() res: Response) {
    try {
      await this.applicationReportsService.remove(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Application report deleted successfully",
      });
    } catch (error) {
      const status = error.message.includes("not found")
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error.message,
      });
    }
  }
}
