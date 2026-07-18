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
import { TreePlantationReportsService } from "./tree-plantation-reports.service";
import { CreateTreePlantationReportDto } from "./dto/create-tree-plantation-report.dto";
import { UpdateTreePlantationReportDto } from "./dto/update-tree-plantation-report.dto";
import { JwtGuard } from "src/auth/jwt.guard";
import { CurrentUser } from "src/auth/current-user.decorator";
import { User } from "src/users/user.entity";
import { PermissionsGuard } from "src/permissions/guards/permissions.guard";
import { RequiredPermissions } from "src/permissions/decorators/require-permission.decorator";

@Controller("program/tree_plantation/reports")
@UseGuards(JwtGuard, PermissionsGuard)
export class TreePlantationReportsController {
  constructor(private readonly service: TreePlantationReportsService) {}

  @Post()
  @RequiredPermissions([
    "program.tree_plantation_reports.create",
    "super_admin",
    "programs_manager",
  ])
  async create(
    @Body() dto: CreateTreePlantationReportDto,
    @Res() res: Response,
    @CurrentUser() user: User,
  ) {
    try {
      const result = await this.service.create(dto, user);
      return res.status(HttpStatus.CREATED).json({
        success: true,
        message: "Tree plantation report created successfully",
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
    "program.tree_plantation_reports.list_view",
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
        message: "Tree plantation reports retrieved successfully",
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
    "program.tree_plantation_reports.view",
    "super_admin",
    "programs_manager",
    "read_only_super_admin",
  ])
  async findOne(@Param("id") id: string, @Res() res: Response) {
    try {
      const result = await this.service.findOne(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Tree plantation report retrieved successfully",
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
    "program.tree_plantation_reports.update",
    "super_admin",
    "programs_manager",
  ])
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateTreePlantationReportDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.service.update(+id, dto);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Tree plantation report updated successfully",
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
    "program.tree_plantation_reports.delete",
    "super_admin",
    "programs_manager",
  ])
  async remove(@Param("id") id: string, @Res() res: Response) {
    try {
      await this.service.remove(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Tree plantation report deleted successfully",
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
