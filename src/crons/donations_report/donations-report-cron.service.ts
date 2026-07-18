import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { DonationsReportService } from "./donations-report.service";

@Injectable()
export class DonationsReportCronService {
  private readonly logger = new Logger(DonationsReportCronService.name);

  constructor(
    private readonly donationsReportService: DonationsReportService,
  ) {}

  /**
   * Daily cron job - Runs at 3 AM every day (reports previous day)
   * Cron expression: '0 3 * * *' = At 03:00 AM every day
   */
  @Cron("0 3 * * *", {
    name: "donations-daily-report",
    timeZone: "Asia/Karachi",
  })
  async handleDailyReport() {
    try {
      this.logger.log("Starting daily donations report generation...");

      const success =
        await this.donationsReportService.generateAndSendDailyReport();

      if (success) {
        this.logger.log(
          "Daily donations report generated and sent successfully",
        );
      } else {
        this.logger.warn(
          "Daily donations report generation completed but email may not have been sent",
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Daily donations report failed: ${error.message}`,
        error.stack,
      );
      // Don't throw - allow cron to continue running
    }
  }

  /**
   * Weekly cron job - Runs every Monday at 9 AM (reports previous week)
   * Cron expression: '0 9 * * 1' = At 09:00 AM on Monday
   */
  @Cron("0 9 * * 1", {
    name: "donations-weekly-report",
    timeZone: "Asia/Karachi",
  })
  async handleWeeklyReport() {
    try {
      this.logger.log("Starting weekly donations report generation...");

      const success =
        await this.donationsReportService.generateAndSendWeeklyReport();

      if (success) {
        this.logger.log(
          "Weekly donations report generated and sent successfully",
        );
      } else {
        this.logger.warn(
          "Weekly donations report generation completed but email may not have been sent",
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Weekly donations report failed: ${error.message}`,
        error.stack,
      );
      // Don't throw - allow cron to continue running
    }
  }

  /**
   * Monthly cron job - Runs on the 1st of every month at 9 AM (reports previous month)
   * Cron expression: '0 9 1 * *' = At 09:00 AM on the 1st day of every month
   */
  @Cron("0 9 1 * *", {
    name: "donations-monthly-report",
    timeZone: "Asia/Karachi",
  })
  async handleMonthlyReport() {
    try {
      this.logger.log("Starting monthly donations report generation...");

      const success =
        await this.donationsReportService.generateAndSendMonthlyReport();

      if (success) {
        this.logger.log(
          "Monthly donations report generated and sent successfully",
        );
      } else {
        this.logger.warn(
          "Monthly donations report generation completed but email may not have been sent",
        );
      }
    } catch (error: any) {
      this.logger.error(
        `Monthly donations report failed: ${error.message}`,
        error.stack,
      );
      // Don't throw - allow cron to continue running
    }
  }
}
