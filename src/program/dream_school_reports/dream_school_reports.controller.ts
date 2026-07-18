import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { DreamSchoolReportsService } from "./dream_school_reports.service";
import { CreateDreamSchoolReportDto } from "./dto/create-dream_school_report.dto";
import { UpdateDreamSchoolReportDto } from "./dto/update-dream_school_report.dto";
import { JwtGuard } from "src/auth/jwt.guard";
import { PermissionsGuard } from "src/permissions/guards/permissions.guard";
import { CurrentUser } from "src/auth/current-user.decorator";
import { User } from "src/users/user.entity";

@Controller("program/dream-school-reports")
@UseGuards(JwtGuard, PermissionsGuard)
export class DreamSchoolReportsController {
  constructor(
    private readonly dreamSchoolReportsService: DreamSchoolReportsService,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() dto: CreateDreamSchoolReportDto,
    @CurrentUser() user: User,
  ) {
    const data = await this.dreamSchoolReportsService.create(dto, user);
    return {
      success: true,
      message: "Dream school report created successfully",
      data,
    };
  }

  @Get()
  async findAll(
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Query("sortField") sortField?: string,
    @Query("sortOrder") sortOrder?: "ASC" | "DESC",
  ) {
    const pageNum = page ? parseInt(page, 10) : 1;
    const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 10;
    return this.dreamSchoolReportsService.findAll(
      pageNum,
      pageSizeNum,
      sortField,
      sortOrder,
    );
  }

  @Get(":id")
  async findOne(@Param("id") id: string) {
    const data = await this.dreamSchoolReportsService.findOne(+id);
    return { success: true, data };
  }

  @Patch(":id")
  async update(
    @Param("id") id: string,
    @Body() dto: UpdateDreamSchoolReportDto,
    @CurrentUser() user: User,
  ) {
    const data = await this.dreamSchoolReportsService.update(+id, dto, user);
    return {
      success: true,
      message: "Dream school report updated successfully",
      data,
    };
  }

  @Delete(":id")
  @HttpCode(HttpStatus.OK)
  async remove(@Param("id") id: string) {
    await this.dreamSchoolReportsService.remove(+id);
    return {
      success: true,
      message: "Dream school report deleted successfully",
    };
  }
}
