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
import { MarriageGiftReportsService } from "./marriage-gift-reports.service";
import { CreateMarriageGiftReportDto } from "./dto/create-marriage-gift-report.dto";
import { UpdateMarriageGiftReportDto } from "./dto/update-marriage-gift-report.dto";
import { JwtGuard } from "src/auth/jwt.guard";
import { CurrentUser } from "src/auth/current-user.decorator";
import { User } from "src/users/user.entity";
import { PermissionsGuard } from "src/permissions/guards/permissions.guard";
import { RequiredPermissions } from "src/permissions/decorators/require-permission.decorator";

@Controller("program/marriage-gifts/reports")
@UseGuards(JwtGuard, PermissionsGuard)
export class MarriageGiftReportsController {
  constructor(
    private readonly marriageGiftReportsService: MarriageGiftReportsService,
  ) {}

  @Post()
  @RequiredPermissions([
    "program.marriage_gifts_reports.create",
    "super_admin",
    "programs_manager",
  ])
  async create(
    @Body() createMarriageGiftReportDto: CreateMarriageGiftReportDto,
    @CurrentUser() user: User,
  ) {
    return await this.marriageGiftReportsService.create(
      createMarriageGiftReportDto,
      user,
    );
  }

  @Get()
  @RequiredPermissions([
    "program.marriage_gifts_reports.list_view",
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

      const result = await this.marriageGiftReportsService.findAll(
        pageNum,
        pageSizeNum,
        sortField,
        sortOrder,
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Marriage gift reports retrieved successfully",
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
    "program.marriage_gifts_reports.view",
    "super_admin",
    "programs_manager",
    "read_only_super_admin",
  ])
  async findOne(@Param("id") id: string, @Res() res: Response) {
    try {
      const result = await this.marriageGiftReportsService.findOne(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Marriage gift report retrieved successfully",
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
    "program.marriage_gifts_reports.update",
    "super_admin",
    "programs_manager",
  ])
  async update(
    @Param("id") id: string,
    @Body() updateMarriageGiftReportDto: UpdateMarriageGiftReportDto,
    @Res() res: Response,
  ) {
    try {
      const result = await this.marriageGiftReportsService.update(
        +id,
        updateMarriageGiftReportDto,
      );
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Marriage gift report updated successfully",
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
    "program.marriage_gifts_reports.delete",
    "super_admin",
    "programs_manager",
  ])
  async remove(@Param("id") id: string, @Res() res: Response) {
    try {
      await this.marriageGiftReportsService.remove(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Marriage gift report deleted successfully",
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
