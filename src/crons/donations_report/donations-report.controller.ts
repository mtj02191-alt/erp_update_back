import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Res,
  HttpStatus,
  UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import { DonationsReportService } from "./donations-report.service";
import { JwtGuard } from "../../auth/jwt.guard";
import { PermissionsGuard } from "../../permissions/guards/permissions.guard";
import { RequiredPermissions } from "../../permissions";

@Controller("donations-report")
@UseGuards(JwtGuard, PermissionsGuard)
export class DonationsReportController {
  constructor(
    private readonly donationsReportService: DonationsReportService,
  ) {}

  /**
   * Generate and send daily report manually
   * POST /donations-report/daily
   */
  @Post("daily")
  @RequiredPermissions([
    "fund_raising.donations.view",
    "super_admin",
    "fund_raising_manager",
  ])
  async generateDailyReport(
    @Body() body: { recipientEmail?: string | string[] },
    @Res() res: Response,
  ) {
    try {
      const success =
        await this.donationsReportService.generateAndSendDailyReport(
          body.recipientEmail,
        );

      return res.status(HttpStatus.OK).json({
        success,
        message: success
          ? "Daily report generated and sent successfully"
          : "Daily report generated but email sending failed",
      });
    } catch (error: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Generate and send weekly report manually
   * POST /donations-report/weekly
   */
  @Post("weekly")
  @RequiredPermissions([
    "fund_raising.donations.view",
    "super_admin",
    "fund_raising_manager",
  ])
  async generateWeeklyReport(
    @Body() body: { recipientEmail?: string | string[] },
    @Res() res: Response,
  ) {
    try {
      const success =
        await this.donationsReportService.generateAndSendWeeklyReport(
          body.recipientEmail,
        );

      return res.status(HttpStatus.OK).json({
        success,
        message: success
          ? "Weekly report generated and sent successfully"
          : "Weekly report generated but email sending failed",
      });
    } catch (error: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Generate and send monthly report manually
   * POST /donations-report/monthly
   */
  @Post("monthly")
  @RequiredPermissions([
    "fund_raising.donations.view",
    "super_admin",
    "fund_raising_manager",
  ])
  async generateMonthlyReport(
    @Body() body: { recipientEmail?: string | string[] },
    @Res() res: Response,
  ) {
    try {
      const success =
        await this.donationsReportService.generateAndSendMonthlyReport(
          body.recipientEmail,
        );

      return res.status(HttpStatus.OK).json({
        success,
        message: success
          ? "Monthly report generated and sent successfully"
          : "Monthly report generated but email sending failed",
      });
    } catch (error: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Generate custom report (without sending email)
   * GET /donations-report/custom?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD&type=daily|weekly|monthly
   */
  @Get("custom")
  @RequiredPermissions([
    "fund_raising.donations.view",
    "super_admin",
    "fund_raising_manager",
  ])
  async generateCustomReport(
    @Query("startDate") startDate: string,
    @Query("endDate") endDate: string,
    @Query("type") type: "daily" | "weekly" | "monthly" = "daily",
    @Res() res: Response,
  ) {
    try {
      if (!startDate || !endDate) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message:
            "startDate and endDate query parameters are required (format: YYYY-MM-DD)",
        });
      }

      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: "Invalid date format. Use YYYY-MM-DD format",
        });
      }

      const reportData = await this.donationsReportService.generateCustomReport(
        start,
        end,
        type,
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Custom report generated successfully",
        data: reportData,
      });
    } catch (error: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Generate and send custom report
   * POST /donations-report/custom
   */
  @Post("custom")
  @RequiredPermissions([
    "fund_raising.donations.view",
    "super_admin",
    "fund_raising_manager",
  ])
  async generateAndSendCustomReport(
    @Body()
    body: {
      startDate: string;
      endDate: string;
      type?: "daily" | "weekly" | "monthly";
      recipientEmail?: string | string[];
    },
    @Res() res: Response,
  ) {
    try {
      if (!body.startDate || !body.endDate) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: "startDate and endDate are required (format: YYYY-MM-DD)",
        });
      }

      const start = new Date(body.startDate);
      const end = new Date(body.endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: "Invalid date format. Use YYYY-MM-DD format",
        });
      }

      const reportData = await this.donationsReportService.generateCustomReport(
        start,
        end,
        body.type || "daily",
      );

      const emailSent = await this.donationsReportService.sendReportEmail(
        reportData,
        body.recipientEmail,
      );

      return res.status(HttpStatus.OK).json({
        success: emailSent,
        message: emailSent
          ? "Custom report generated and sent successfully"
          : "Custom report generated but email sending failed",
        data: reportData,
      });
    } catch (error: any) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        message: error.message,
      });
    }
  }
}
