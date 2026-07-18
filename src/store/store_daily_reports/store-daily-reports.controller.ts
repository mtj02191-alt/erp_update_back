import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from "@nestjs/common";
import { StoreDailyReportsService } from "./store-daily-reports.service";
import { CreateStoreDailyReportDto } from "./dto/create-store-daily-report.dto";
import { UpdateStoreDailyReportDto } from "./dto/update-store-daily-report.dto";
import { JwtGuard } from "../../auth/jwt.guard";
import { RolesGuard } from "../../auth/roles.guard";
import { Roles } from "../../auth/roles.decorator";
import { CurrentUser } from "../../auth/current-user.decorator";
import { User, UserRole } from "../../users/user.entity";
import { PermissionsGuard } from "src/permissions/guards/permissions.guard";
import { RequiredPermissions } from "src/permissions/decorators/require-permission.decorator";

@Controller("store/reports")
@UseGuards(JwtGuard, PermissionsGuard)
export class StoreDailyReportsController {
  constructor(
    private readonly storeDailyReportsService: StoreDailyReportsService,
  ) {}

  @Post()
  @RequiredPermissions(["store.reports.create", "super_admin", "store_manager"])
  create(
    @Body() createStoreDailyReportDto: CreateStoreDailyReportDto,
    @CurrentUser() user: User,
  ) {
    return this.storeDailyReportsService.create(
      createStoreDailyReportDto,
      user,
    );
  }

  @Get()
  @RequiredPermissions([
    "store.reports.list_view",
    "super_admin",
    "store_manager",
    "read_only_super_admin",
  ])
  findAll(
    @CurrentUser() user: User,
    @Query("page") page: string = "1",
    @Query("pageSize") pageSize: string = "10",
    @Query("sortField") sortField: string = "created_at",
    @Query("sortOrder") sortOrder: "ASC" | "DESC" = "DESC",
  ) {
    const pageNum = parseInt(page, 10) || 1;
    const pageSizeNum = parseInt(pageSize, 10) || 10;

    return this.storeDailyReportsService.findAll(user, {
      page: pageNum,
      pageSize: pageSizeNum,
      sortField,
      sortOrder,
    });
  }

  @Get(":id")
  @RequiredPermissions([
    "store.reports.view",
    "super_admin",
    "store_manager",
    "read_only_super_admin",
  ])
  findOne(@Param("id") id: string, @CurrentUser() user: User) {
    return this.storeDailyReportsService.findOne(+id, user);
  }

  @Patch(":id")
  @RequiredPermissions(["store.reports.update", "super_admin", "store_manager"])
  update(
    @Param("id") id: string,
    @Body() updateStoreDailyReportDto: UpdateStoreDailyReportDto,
    @CurrentUser() user: User,
  ) {
    return this.storeDailyReportsService.update(
      +id,
      updateStoreDailyReportDto,
      user,
    );
  }

  @Delete(":id")
  @RequiredPermissions(["store.reports.delete", "super_admin", "store_manager"])
  remove(@Param("id") id: string, @CurrentUser() user: User) {
    return this.storeDailyReportsService.remove(+id, user);
  }
}
