import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  HttpStatus,
  HttpCode,
  UseGuards,
} from "@nestjs/common";
import { KasbTrainingReportsService } from "./kasb-training-reports.service";
import { CreateKasbTrainingReportDto } from "./dto/create-kasb-training-report.dto";
import { UpdateKasbTrainingReportDto } from "./dto/update-kasb-training-report.dto";
import { JwtGuard } from "src/auth/jwt.guard";
import { CurrentUser } from "src/auth/current-user.decorator";
import { User } from "src/users/user.entity";
import { PermissionsGuard } from "src/permissions/guards/permissions.guard";
import { RequiredPermissions } from "src/permissions/decorators/require-permission.decorator";

@Controller("program/kasb-training/reports")
@UseGuards(JwtGuard, PermissionsGuard)
export class KasbTrainingReportsController {
  constructor(
    private readonly kasbTrainingReportsService: KasbTrainingReportsService,
  ) {}

  @Post()
  @RequiredPermissions([
    "program.kasb_training_reports.create",
    "super_admin",
    "programs_manager",
  ])
  @HttpCode(HttpStatus.CREATED)
  async create(
    @Body() createDto: CreateKasbTrainingReportDto,
    @CurrentUser() user: User,
  ) {
    const report = await this.kasbTrainingReportsService.create(
      createDto,
      user,
    );
    return {
      success: true,
      message: "Kasb training report created successfully",
      data: report,
    };
  }

  @Post("multiple")
  @RequiredPermissions([
    "program.kasb_training_reports.create",
    "super_admin",
    "programs_manager",
  ])
  @HttpCode(HttpStatus.CREATED)
  async createMultiple(
    @Body() createDtos: CreateKasbTrainingReportDto[],
    @CurrentUser() user: User,
  ) {
    const reports = await this.kasbTrainingReportsService.createMultiple(
      createDtos,
      user,
    );
    return {
      success: true,
      message: "Kasb training reports created successfully",
      data: reports,
    };
  }

  @Get("date/:date")
  @RequiredPermissions([
    "program.kasb_training_reports.view",
    "super_admin",
    "programs_manager",
    "read_only_super_admin",
  ])
  async findByDate(@Param("date") date: string) {
    const reports = await this.kasbTrainingReportsService.findByDate(date);

    return {
      success: true,
      data: {
        date,
        activities: reports.map((report) => ({
          id: report.id,
          skill_level: report.skill_level,
          quantity: report.quantity,
          addition: report.addition,
          left: report.left,
          total: report.total,
        })),
      },
    };
  }

  @Delete("date/:date")
  @RequiredPermissions([
    "program.kasb_training_reports.delete",
    "super_admin",
    "programs_manager",
  ])
  async removeByDate(@Param("date") date: string) {
    await this.kasbTrainingReportsService.removeByDate(date);
    return {
      success: true,
      message: "Kasb training reports deleted successfully for this date",
    };
  }

  @Get()
  @RequiredPermissions([
    "program.kasb_training_reports.list_view",
    "super_admin",
    "programs_manager",
    "read_only_super_admin",
  ])
  async findAll() {
    const reports = await this.kasbTrainingReportsService.findAll();
    return {
      success: true,
      data: reports,
    };
  }

  @Get(":id")
  @RequiredPermissions([
    "program.kasb_training_reports.view",
    "super_admin",
    "programs_manager",
    "read_only_super_admin",
  ])
  async findOne(@Param("id") id: string) {
    const report = await this.kasbTrainingReportsService.findOne(+id);
    const dateKey =
      report.date instanceof Date
        ? report.date.toISOString().split("T")[0]
        : new Date(report.date).toISOString().split("T")[0];

    const activities =
      await this.kasbTrainingReportsService.findByDate(dateKey);
    return {
      success: true,
      data: {
        id: report.id,
        date: dateKey,
        activities: activities.map((a) => ({
          id: a.id,
          skill_level: a.skill_level,
          quantity: a.quantity,
          addition: a.addition,
          left: a.left,
          total: a.total,
        })),
      },
    };
  }

  @Patch(":id")
  @RequiredPermissions([
    "program.kasb_training_reports.update",
    "super_admin",
    "programs_manager",
  ])
  async update(
    @Param("id") id: string,
    @Body() updateDto: UpdateKasbTrainingReportDto,
  ) {
    const report = await this.kasbTrainingReportsService.update(+id, updateDto);
    return {
      success: true,
      message: "Kasb training report updated successfully",
      data: report,
    };
  }

  @Delete(":id")
  @RequiredPermissions([
    "program.kasb_training_reports.delete",
    "super_admin",
    "programs_manager",
  ])
  async remove(@Param("id") id: string) {
    await this.kasbTrainingReportsService.remove(+id);
    return {
      success: true,
      message: "Kasb training report deleted successfully",
    };
  }
}
