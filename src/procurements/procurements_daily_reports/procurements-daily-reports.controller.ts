import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  ParseIntPipe,
  DefaultValuePipe,
} from "@nestjs/common";
import { ProcurementsDailyReportsService } from "./procurements-daily-reports.service";
import { CreateProcurementsDailyReportDto } from "./dto/create-procurements-daily-report.dto";
import { UpdateProcurementsDailyReportDto } from "./dto/update-procurements-daily-report.dto";
import { JwtGuard } from "../../auth/jwt.guard";
import { RolesGuard } from "../../auth/guards/roles.guard";
import { Roles } from "../../auth/decorators/roles.decorator";
import { User, UserRole } from "../../users/user.entity";
import { CurrentUser } from "src/auth/current-user.decorator";
import { PermissionsGuard } from "../../permissions/guards/permissions.guard";
import { RequiredPermissions } from "../../permissions/decorators/require-permission.decorator";

@Controller("procurements/reports")
@UseGuards(JwtGuard, PermissionsGuard)
export class ProcurementsDailyReportsController {
  constructor(
    private readonly procurementsDailyReportsService: ProcurementsDailyReportsService,
  ) {}

  @Post()
  @RequiredPermissions(["procuremnets_manger", "super_admin"])
  create(
    @Body() createDto: CreateProcurementsDailyReportDto,
    @CurrentUser() user: User,
  ) {
    return this.procurementsDailyReportsService.create(createDto, user);
  }

  @Get()
  @RequiredPermissions([
    "procuremnets_manger",
    "super_admin",
    "read_only_super_admin",
    "procurements.reports.list_view",
  ])
  findAll(
    @Query("page", new DefaultValuePipe(1), ParseIntPipe) page: number,
    @Query("pageSize", new DefaultValuePipe(10), ParseIntPipe) pageSize: number,
    @Query("sortField", new DefaultValuePipe("date")) sortField: string,
    @Query("sortOrder", new DefaultValuePipe("DESC")) sortOrder: "ASC" | "DESC",
  ) {
    return this.procurementsDailyReportsService.findAll(
      page,
      pageSize,
      sortField,
      sortOrder,
    );
  }

  @Get(":id")
  @RequiredPermissions([
    "procuremnets_manger",
    "super_admin",
    "read_only_super_admin",
    "procurements.reports.view",
  ])
  findOne(@Param("id", ParseIntPipe) id: number) {
    return this.procurementsDailyReportsService.findOne(id);
  }

  @Patch(":id")
  @RequiredPermissions([
    "procuremnets_manger",
    "super_admin",
    "read_only_super_admin",
    "procurements.reports.update",
  ])
  update(
    @Param("id", ParseIntPipe) id: number,
    @Body() updateDto: UpdateProcurementsDailyReportDto,
  ) {
    return this.procurementsDailyReportsService.update(id, updateDto);
  }

  @Delete(":id")
  @RequiredPermissions([
    "procuremnets_manger",
    "super_admin",
    "read_only_super_admin",
    "procurements.reports.delete",
  ])
  remove(@Param("id", ParseIntPipe) id: number) {
    return this.procurementsDailyReportsService.remove(id);
  }
}
