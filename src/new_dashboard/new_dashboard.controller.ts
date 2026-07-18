import { Controller, Get, Query, UseGuards } from "@nestjs/common";
import { NewDashboardService } from "./new_dashboard.service";
import { ProgramApplicationOverviewQueryDto } from "./dto/program-application-overview-query.dto";
import { DeliverablesOverviewQueryDto } from "./dto/deliverables-overview-query.dto";
import { StoreDailyLatestQueryDto } from "./dto/store-daily-latest-query.dto";
import { MonthlySumQueryDto } from "./dto/monthly-sum-query.dto";
import { JwtGuard } from "src/auth/jwt.guard";
import { PermissionsGuard } from "src/permissions/guards/permissions.guard";
import { RequiredPermissions } from "src/permissions/decorators/require-permission.decorator";

@Controller("new-dashboard")
@UseGuards(JwtGuard, PermissionsGuard)
export class NewDashboardController {
  constructor(private readonly newDashboardService: NewDashboardService) {}

  /**
   * Program application overview cards (same shape as frontend `dummyData.js` + Overall card).
   * Query: optional `from`, `to` (YYYY-MM-DD) on `report_date` (inclusive range when both set).
   */
  @Get("dashboard-report/program-application-overview")
  // @RequiredPermissions([
  //   'program.application_reports.list_view',
  //   'super_admin',
  //   'programs_manager',
  //   'read_only_super_admin',
  // ])
  async getProgramApplicationOverview(
    @Query() query: ProgramApplicationOverviewQueryDto,
  ) {
    const result =
      await this.newDashboardService.getProgramApplicationOverview(query);
    return {
      success: true,
      message: "Program application overview retrieved successfully",
      ...result,
    };
  }

  /**
   * Overall deliverables snapshot: per-program totals (left) + vulnerability rollups across programs (right).
   * Query: optional `from`, `to` (YYYY-MM-DD) on each report’s date column (inclusive when both set).
   */
  @Get("dashboard-report/deliverables-overall")
  // @RequiredPermissions([
  //   'program.application_reports.list_view',
  //   'super_admin',
  //   'programs_manager',
  //   'read_only_super_admin',
  // ])
  async getDeliverablesOverall(@Query() query: DeliverablesOverviewQueryDto) {
    const data =
      await this.newDashboardService.getDeliverablesOverallCard(query);
    return {
      success: true,
      message: "Deliverables overall retrieved successfully",
      data,
    };
  }

  /**
   * Latest store daily report (for single-card dashboards).
   * Query: optional `from`, `to` (YYYY-MM-DD) on `store_daily_reports.date` (inclusive).
   */
  @Get("dashboard-report/store-daily-latest")
  // @RequiredPermissions([
  //   'store.reports.list_view',
  //   'super_admin',
  //   'store_manager',
  //   'read_only_super_admin',
  // ])
  async getStoreDailyLatest(@Query() query: StoreDailyLatestQueryDto) {
    const result = await this.newDashboardService.getStoreDailyLatest(query);
    return {
      success: true,
      message: "Store daily latest retrieved successfully",
      ...result,
    };
  }

  @Get("dashboard-report/store-daily-month-sum")
  // @RequiredPermissions(['store.reports.list_view', 'super_admin', 'store_manager', 'read_only_super_admin'])
  async getStoreDailyMonthSum(@Query() query: MonthlySumQueryDto) {
    const result =
      await this.newDashboardService.getStoreDailyMonthlySum(query);
    return {
      success: true,
      message: "Store daily sum retrieved successfully",
      ...result,
    };
  }

  @Get("dashboard-report/procurements-daily-month-sum")
  // @RequiredPermissions([
  //   'procurements.reports.list_view',
  //   'super_admin',
  //   'read_only_super_admin',
  //   'procuremnets_manger',
  // ])
  async getProcurementsMonthSum(@Query() query: MonthlySumQueryDto) {
    const result =
      await this.newDashboardService.getProcurementsMonthlySum(query);
    return {
      success: true,
      message: "Procurements daily sum retrieved successfully",
      ...result,
    };
  }

  @Get("dashboard-report/accounts-and-finance-daily-month-sum")
  // @RequiredPermissions([
  //   'accounts_and_finance.reports.list_view',
  //   'super_admin',
  //   'accounts_and_finance_manager',
  // ])
  async getAccountsAndFinanceMonthSum(@Query() query: MonthlySumQueryDto) {
    const result =
      await this.newDashboardService.getAccountsAndFinanceMonthlySum(query);
    return {
      success: true,
      message: "Accounts and finance daily sum retrieved successfully",
      ...result,
    };
  }

  @Get("dashboard-report/al-hasanain-clg-month-sum")
  // @RequiredPermissions([
  //   'program.al_hasanain_clg.list_view',
  //   'super_admin',
  //   'programs_manager',
  //   'read_only_super_admin',
  // ])
  async getAlHasanainClgMonthSum(@Query() query: MonthlySumQueryDto) {
    const result =
      await this.newDashboardService.getAlHasanainClgMonthlySum(query);
    return {
      success: true,
      message: "Al Hasanain CLG sum retrieved successfully",
      ...result,
    };
  }

  @Get("dashboard-report/aas-collection-centers-report-month-sum")
  // @RequiredPermissions([
  //   'program.aas_collection_centers_reports.list_view',
  //   'program.application_reports.list_view',
  //   'super_admin',
  //   'programs_manager',
  //   'read_only_super_admin',
  // ])
  async getAasCollectionCentersReportMonthSum(
    @Query() query: MonthlySumQueryDto,
  ) {
    const result =
      await this.newDashboardService.getAasCollectionCentersReportMonthlySum(
        query,
      );
    return {
      success: true,
      message: "AAS collection centers report sum retrieved successfully",
      ...result,
    };
  }

  @Get("dashboard-report/dream-school-reports-month-sum")
  // @RequiredPermissions([
  //   'program.application_reports.list_view',
  //   'super_admin',
  //   'programs_manager',
  //   'read_only_super_admin',
  // ])
  async getDreamSchoolReportsMonthSum(@Query() query: MonthlySumQueryDto) {
    const result =
      await this.newDashboardService.getDreamSchoolReportsMonthlySum(query);
    return {
      success: true,
      message: "Dream school reports sum retrieved successfully",
      ...result,
    };
  }

  @Get("dashboard-report/health-reports-month-sum")
  // @RequiredPermissions(['program.health_reports.list_view', 'super_admin', 'programs_manager', 'read_only_super_admin'])
  async getHealthReportsMonthSum(@Query() query: MonthlySumQueryDto) {
    const result =
      await this.newDashboardService.getHealthReportsMonthlySum(query);
    return {
      success: true,
      message: "Health reports sum retrieved successfully",
      ...result,
    };
  }
}
