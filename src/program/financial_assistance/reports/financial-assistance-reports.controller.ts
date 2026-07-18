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
import { FinancialAssistanceReportsService } from "./financial-assistance-reports.service";
import { CreateFinancialAssistanceReportDto } from "./dto/create-financial-assistance-report.dto";
import { UpdateFinancialAssistanceReportDto } from "./dto/update-financial-assistance-report.dto";
import { JwtGuard } from "src/auth/jwt.guard";
import { CurrentUser } from "src/auth/current-user.decorator";
import { User } from "src/users/user.entity";
import { PermissionsGuard } from "src/permissions/guards/permissions.guard";
import { RequiredPermissions } from "src/permissions/decorators/require-permission.decorator";

@Controller("program/financial_assistance/reports")
@UseGuards(JwtGuard, PermissionsGuard)
export class FinancialAssistanceReportsController {
  constructor(
    private readonly financialAssistanceReportsService: FinancialAssistanceReportsService,
  ) {}

  @Post()
  @RequiredPermissions([
    "program.financial_assistance_reports.create",
    "super_admin",
    "programs_manager",
  ])
  async create(
    @Body() createDto: CreateFinancialAssistanceReportDto,
    @CurrentUser() user: User,
  ) {
    try {
      return await this.financialAssistanceReportsService.create(
        createDto,
        user,
      );
    } catch (error) {
      return error.message;
    }
  }

  @Get()
  @RequiredPermissions([
    "program.financial_assistance_reports.list_view",
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

      const result = await this.financialAssistanceReportsService.findAll(
        pageNum,
        pageSizeNum,
        sortField,
        sortOrder,
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Financial assistance reports retrieved successfully",
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
    "program.financial_assistance_reports.view",
    "super_admin",
    "programs_manager",
    "read_only_super_admin",
  ])
  async findOne(@Param("id") id: string, @Res() res: Response) {
    try {
      const result = await this.financialAssistanceReportsService.findOne(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Financial assistance report retrieved successfully",
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
    "program.financial_assistance_reports.update",
    "super_admin",
    "programs_manager",
  ])
  async update(
    @Param("id") id: string,
    @Body() updateDto: UpdateFinancialAssistanceReportDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.financialAssistanceReportsService.update(
        +id,
        updateDto,
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Financial assistance report updated successfully",
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
    "program.financial_assistance_reports.delete",
    "super_admin",
    "programs_manager",
  ])
  async remove(@Param("id") id: string, @Res() res: Response) {
    try {
      await this.financialAssistanceReportsService.remove(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Financial assistance report deleted successfully",
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
