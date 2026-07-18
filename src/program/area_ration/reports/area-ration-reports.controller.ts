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
import { AreaRationReportsService } from "./area-ration-reports.service";
import { CreateAreaRationReportDto } from "./dto/create-area-ration-report.dto";
import { UpdateAreaRationReportDto } from "./dto/update-area-ration-report.dto";
import { JwtGuard } from "src/auth/jwt.guard";
import { CurrentUser } from "src/auth/current-user.decorator";
import { User } from "src/users/user.entity";
import { PermissionsGuard } from "src/permissions/guards/permissions.guard";
import { RequiredPermissions } from "src/permissions/decorators/require-permission.decorator";

@Controller("program/area_ration/reports")
@UseGuards(JwtGuard, PermissionsGuard)
export class AreaRationReportsController {
  constructor(private readonly service: AreaRationReportsService) {}

  @Post()
  @RequiredPermissions([
    "program.area_ration_reports.create",
    "super_admin",
    "programs_manager",
  ])
  async create(
    @Body() dto: CreateAreaRationReportDto,
    @CurrentUser() user: User,
  ) {
    try {
      return await this.service.create(dto, user);
    } catch (error) {
      return error.message;
    }
  }

  @Get()
  @RequiredPermissions([
    "program.area_ration_reports.list_view",
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
      const result = await this.service.findAll(
        pageNum,
        pageSizeNum,
        sortField,
        sortOrder,
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Area ration reports retrieved successfully",
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
    "program.area_ration_reports.view",
    "super_admin",
    "programs_manager",
    "read_only_super_admin",
  ])
  async findOne(@Param("id") id: string, @Res() res: Response) {
    try {
      const result = await this.service.findOne(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Area ration report retrieved successfully",
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
    "program.area_ration_reports.update",
    "super_admin",
    "programs_manager",
  ])
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateAreaRationReportDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.service.update(+id, dto);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Area ration report updated successfully",
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
    "program.area_ration_reports.delete",
    "super_admin",
    "programs_manager",
  ])
  async remove(@Param("id") id: string, @Res() res: Response) {
    try {
      await this.service.remove(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Area ration report deleted successfully",
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
