import { Controller, Post, Res, UseGuards } from "@nestjs/common";
import { Response } from "express";
import { DmsCronsService } from "./dms-crons.service";
import { JwtGuard } from "../../auth/jwt.guard";
import { PermissionsGuard } from "../../permissions/guards/permissions.guard";
import { RequiredPermissions } from "../../permissions";

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
}
