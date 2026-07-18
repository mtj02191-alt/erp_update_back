import { Controller, Post, Body, UseGuards, Get } from "@nestjs/common";
import { AdminService } from "./services/admin.service";
import { AdminReportDto } from "./dto/admin-report.dto";
import { JwtGuard } from "../auth/jwt.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { Roles } from "../auth/decorators/roles.decorator";
import { UserRole } from "../users/user.entity";
import { PermissionsGuard } from "../permissions/guards/permissions.guard";
import { RequiredPermissions } from "../permissions/decorators/require-permission.decorator";

@Controller("admin")
@UseGuards(JwtGuard, PermissionsGuard)
// @Roles(UserRole.ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Post("daily-reports")
  @RequiredPermissions([
    "super_admin",
    "read_only_super_admin",
    "accounts_and_finance_manager",
    "programs_manager",
    "store_manger",
    "procuremnets_manger",
  ])
  async getDailyReports(@Body() body: any) {
    return this.adminService.getAllDailyReports(body);
  }
}
