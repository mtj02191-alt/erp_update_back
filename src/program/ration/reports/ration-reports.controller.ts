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
  Res,
  UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import { RationReportsService } from "./ration-reports.service";
import { CreateRationReportDto } from "./dto/create-ration-report.dto";
import { UpdateRationReportDto } from "./dto/update-ration-report.dto";
import { JwtGuard } from "src/auth/jwt.guard";
import { CurrentUser } from "src/auth/current-user.decorator";
import { User } from "src/users/user.entity";
import { PermissionsGuard } from "src/permissions/guards/permissions.guard";
import { RequiredPermissions } from "src/permissions/decorators/require-permission.decorator";

@Controller("program/ration/reports")
@UseGuards(JwtGuard, PermissionsGuard)
export class RationReportsController {
  constructor(private readonly rationReportsService: RationReportsService) {}

  @Post()
  @RequiredPermissions([
    "program.ration_reports.create",
    "super_admin",
    "programs_manager",
  ])
  async create(
    @Body() createRationReportDto: CreateRationReportDto,
    @Res() res: Response,
    @CurrentUser() user: User,
  ) {
    try {
      const result = await this.rationReportsService.create(
        createRationReportDto,
        user,
      );
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: "Ration report created successfully",
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
    "program.ration_reports.list_view",
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

      const result = await this.rationReportsService.findAll(
        pageNum,
        pageSizeNum,
        sortField,
        sortOrder,
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Ration reports retrieved successfully",
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
    "program.ration_reports.view",
    "super_admin",
    "programs_manager",
    "read_only_super_admin",
  ])
  async findOne(@Param("id") id: string, @Res() res: Response) {
    try {
      const result = await this.rationReportsService.findOne(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Ration report retrieved successfully",
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
    "program.ration_reports.update",
    "super_admin",
    "programs_manager",
  ])
  async update(
    @Param("id") id: string,
    @Body() updateRationReportDto: UpdateRationReportDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.rationReportsService.update(
        +id,
        updateRationReportDto,
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Ration report updated successfully",
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
    "program.ration_reports.delete",
    "super_admin",
    "programs_manager",
  ])
  async remove(@Param("id") id: string, @Res() res: Response) {
    try {
      await this.rationReportsService.remove(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Ration report deleted successfully",
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
