import {
  Controller,
  Get,
  HttpStatus,
  Query,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import { JwtGuard } from "src/auth/jwt.guard";
import { PermissionsGuard } from "src/permissions/guards/permissions.guard";
import { DONATION_VIEW_GUARD, RequiredPermissions } from "src/permissions";
import { ProgressReportsService } from "./progress-reports.service";

@Controller("progress/reports")
@UseGuards(JwtGuard, PermissionsGuard)
@RequiredPermissions([...DONATION_VIEW_GUARD])
export class ProgressReportsController {
  constructor(private readonly service: ProgressReportsService) {}

  /**
   * Dashboard report: for a selected parent workflow template, return child-template series.
   *
   * GET /progress/reports/template-tree-summary?template_id=123&start_date=2026-05-01&end_date=2026-05-31&interval=daily
   */
  @Get("template-tree-summary")
  async templateTreeSummary(
    @Query("template_id") templateId?: string,
    @Query("start_date") start_date?: string,
    @Query("end_date") end_date?: string,
    @Query("interval") interval?: string,
    @Res() res?: Response,
  ) {
    try {
      const data = await this.service.getTemplateTreeSummary({
        template_id: templateId,
        start_date,
        end_date,
        interval,
      });
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Template report retrieved",
        data,
      });
    } catch (error: any) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error?.message || "Failed to load template report",
        data: null,
      });
    }
  }
}

