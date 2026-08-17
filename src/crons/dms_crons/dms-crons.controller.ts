import { Controller, Post, Query, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { DmsCronsService } from "./dms-crons.service";
import { JwtGuard } from "../../auth/jwt.guard";
import { PermissionsGuard } from "../../permissions/guards/permissions.guard";
import { RequiredPermissions } from "../../permissions";
import { CampaignTargetFrequency } from "../../dms/campaigns/utils/campaign-recurring.constants";

@Controller("dms-crons")
// @UseGuards(JwtGuard, PermissionsGuard)
export class DmsCronsController {
  constructor(private readonly dmsCronsService: DmsCronsService) {}

  /**
   * One-time manual trigger to sync ALL non-completed Meezan donations
   * POST /dms-crons/sync-meezan
   */
  @Post("sync-meezan")
  // @RequiredPermissions(['fund_raising.donations.view', 'super_admin', 'fund_raising_manager'])
  async syncMeezanDonations(@Res() res: Response) {
    try {
      const result = await this.dmsCronsService.syncMeezanDonations(true);
      return res.status(200).json({
        success: true,
        message: `Meezan sync complete — Total: ${result.total}, Synced: ${result.synced}, Updated: ${result.updated}, Failed: ${result.failed}`,
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: `Meezan sync failed: ${error.message}`,
      });
    }
  }

  /**
   * One-time manual trigger to clean up pending donations
   * POST /dms-crons/cleanup-pending-donations
   */
  @Post("cleanup-pending-donations")
  // @RequiredPermissions(['fund_raising.donations.view', 'super_admin', 'fund_raising_manager'])
  async cleanupPendingDonations(@Res() res: Response) {
    try {
      const result = await this.dmsCronsService.cleanupPendingDonations();
      return res.status(200).json({
        success: true,
        message: `Pending donations cleanup complete — Processed Donors: ${result.processedDonors}, Deleted Donations: ${result.deletedDonations}`,
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: `Pending donations cleanup failed: ${error.message}`,
      });
    }
  }

  /**
   * Manual trigger for recurring-campaign donor automation.
   * POST /dms-crons/manual-recurring-reminders?run_due=true&dry_run=true
   * POST /dms-crons/manual-recurring-reminders?frequency=daily&dry_run=true
   * POST /dms-crons/manual-recurring-reminders?frequency=weekly&period_key=2026-07-20_2026-07-26
   */
  @Post("manual-recurring-reminders")
  async manualRecurringReminders(
    @Query("period_key") periodKey: string | undefined,
    @Query("frequency") frequency: string | undefined,
    @Query("run_due") runDue: string | undefined,
    @Query("dry_run") dryRun: string | undefined,
    @Query("force") force: string | undefined,
    @Query("chunk_size") chunkSize: string | undefined,
    @Query("include_details") includeDetails: string | undefined,
    @Res() res: Response,
  ) {
    try {
      const result = await this.dmsCronsService.runManualRecurringDonationReminders({
        period_key: periodKey,
        frequency: frequency as CampaignTargetFrequency | undefined,
        run_due: runDue === undefined ? undefined : runDue === "true",
        dry_run: dryRun === "true",
        force: force === "true",
        chunk_size: chunkSize ? Number(chunkSize) : undefined,
        include_details: includeDetails === "true",
      });
      return res.status(200).json({
        success: true,
        message: `Recurring campaign job (${result.period_key}) — scanned: ${result.scanned}, reminders: ${result.reminders_sent}, thanks: ${result.thanks_sent}, dry_run: ${result.dry_run}`,
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: `Manual recurring reminders failed: ${error.message}`,
      });
    }
  }

  /**
   * Activate manual recurring pledges for completed donations with pending intent.
   * POST /dms-crons/activate-manual-recurring-intents?limit=100
   */
  @Post("activate-manual-recurring-intents")
  async activateManualRecurringIntents(
    @Query("limit") limit: string | undefined,
    @Res() res: Response,
  ) {
    try {
      const result = await this.dmsCronsService.runActivateManualRecurringIntents(
        limit ? Number(limit) : 100,
      );
      return res.status(200).json({
        success: true,
        message: `Manual recurring intents — scanned: ${result.scanned}, activated: ${result.activated}, skipped: ${result.skipped}`,
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: `Activate manual recurring intents failed: ${error.message}`,
      });
    }
  }

  /**
   * Manual trigger: spawn next DMS todo occurrences for due recurring items.
   * POST /dms-crons/dms-todos-spawn-due-recurring?as_of=2026-07-29
   */
  @Post("dms-todos-spawn-due-recurring")
  async spawnDueRecurringDmsTodos(
    @Query("as_of") asOf: string | undefined,
    @Res() res: Response,
  ) {
    try {
      const result =
        await this.dmsCronsService.runDmsTodosDueRecurringSpawn(asOf);
      return res.status(200).json({
        success: true,
        message: `DMS todos recurring spawn — scanned: ${result.scanned}, spawned: ${result.spawned}, skipped: ${result.skipped}`,
        data: result,
      });
    } catch (error) {
      return res.status(500).json({
        success: false,
        message: `DMS todos recurring spawn failed: ${error.message}`,
      });
    }
  }
}
