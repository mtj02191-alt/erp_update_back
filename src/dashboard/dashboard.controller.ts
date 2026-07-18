import {
  Controller,
  Get,
  Query,
  HttpStatus,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import { DashboardAggregateService } from "./dashboard-aggregate.service";
import { ConditionalJwtGuard } from "../auth/guards/conditional-jwt.guard";
import { PermissionsGuard } from "../permissions/guards/permissions.guard";
import { RequiredPermissions } from "../permissions";
import { DashboardFundraisingOverviewQueryDto } from "./dto/dashboard-query.dto";

@Controller("dashboard")
@UseGuards(ConditionalJwtGuard, PermissionsGuard)
@RequiredPermissions(["dms.dashboard.view", "super_admin"])
export class DashboardController {
  constructor(private readonly aggregateService: DashboardAggregateService) {}

  /**
   * GET /dashboard/fundraising-overview?months=12 | ?year=2024
   * Returns cards (totals by category), cumulative series, and raised-per-month for charts.
   */
  @Get("fundraising-overview")
  async getFundraisingOverview(
    @Query() query: DashboardFundraisingOverviewQueryDto,
    @Res() res: Response,
  ) {
    try {
      const data = await this.aggregateService.getFundraisingOverview({
        year: query.year,
        months: query.months,
        donation_type: query.donation_type,
        donation_method: query.donation_method,
        ref: query.ref,
        projects: query.projects,
        date: query.date,
        start_date: query.start_date,
        end_date: query.end_date,
      });
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Fundraising overview retrieved",
        data,
      });
    } catch (error: any) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }
}
