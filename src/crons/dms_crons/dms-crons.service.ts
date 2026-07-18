import { Injectable, Logger } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, In, Not, IsNull, FindOperator } from "typeorm";
import { Donation } from "../../donations/entities/donation.entity";
import { DonationsService } from "../../donations/donations.service";

@Injectable()
export class DmsCronsService {
  private readonly logger = new Logger(DmsCronsService.name);

  constructor(
    @InjectRepository(Donation)
    private readonly donationRepository: Repository<Donation>,
    private readonly donationsService: DonationsService,
  ) {}

  /**
   * Nightly cron - Runs at 1:30 AM every day (Asia/Karachi)
   * Syncs all pending/registered Meezan donations with the Meezan API
   */
  @Cron("30 1 * * *", {
    name: "meezan-nightly-status-sync",
    timeZone: "Asia/Karachi",
  })
  async handleNightlyMeezanSync() {
    this.logger.log("⏰ Nightly Meezan status sync cron started");
    await this.syncMeezanDonations();
  }

  /**
   * Nightly cron - Runs at 2:00 AM every day (Asia/Karachi)
   * Cleans up multiple pending donations for donors on the same day.
   */
  @Cron("0 2 * * *", {
    name: "daily-pending-donations-cleanup",
    timeZone: "Asia/Karachi",
  })
  async handleDailyPendingDonationsCleanup() {
    this.logger.log("⏰ Daily pending donations cleanup cron started");
    await this.cleanupPendingDonations();
  }

  /**
   * Core sync logic - Fetches Meezan donations and syncs their status with the Meezan API.
   * Uses DonationsService.getProviderStatus() which handles:
   *   - Querying Meezan API via getMeezanOrderStatusExtended()
   *   - Mapping Meezan orderStatus to donation status via mapMeezanStatusToDonationStatus()
   *   - Updating the donation record if status changed
   *   - Triggering dashboard aggregation on completion/reversal
   *
   * @param allNonCompleted - If true, fetches ALL Meezan donations not yet completed (for manual trigger).
   *                          If false, only fetches pending/registered (for nightly cron).
   * @returns Summary of the sync operation
   */
  async syncMeezanDonations(allNonCompleted = false): Promise<{
    total: number;
    synced: number;
    updated: number;
    failed: number;
    results: any[];
  }> {
    const startTime = Date.now();

    try {
      const statusFilter = allNonCompleted
        ? Not(In(["completed"]))
        : In(["pending", "registered", "failed", "cancelled", "refunded"]);

      const label = allNonCompleted
        ? "non-completed"
        : "pending/registered/failed/cancelled/refunded";

      const pendingMeezanDonations = await this.donationRepository.find({
        where: {
          donation_method: "meezan",
          status: statusFilter,
          orderId: Not(IsNull()),
        },
        select: ["id", "orderId", "status", "amount", "created_at"],
        order: { created_at: "DESC" },
      });

      const total = pendingMeezanDonations.length;
      this.logger.log(`Found ${total} ${label} Meezan donations to sync`);

      if (total === 0) {
        this.logger.log("No pending Meezan donations found. Sync complete.");
        return { total: 0, synced: 0, updated: 0, failed: 0, results: [] };
      }

      let synced = 0;
      let updated = 0;
      let failed = 0;
      const results: any[] = [];

      // Process each donation sequentially to avoid overwhelming the Meezan API
      for (const donation of pendingMeezanDonations) {
        try {
          const result = await this.donationsService.getProviderStatus(
            donation.id,
          );
          synced++;

          if (result.dbUpdated) {
            updated++;
            this.logger.log(
              `Donation #${donation.id}: ${donation.status} → ${result.donationStatus} (updated)`,
            );
          }

          results.push({
            donationId: donation.id,
            previousStatus: donation.status,
            newStatus: result.donationStatus,
            dbUpdated: result.dbUpdated,
          });
        } catch (error) {
          failed++;
          this.logger.error(
            `Failed to sync donation #${donation.id}: ${error.message}`,
          );
          results.push({
            donationId: donation.id,
            previousStatus: donation.status,
            error: error.message,
          });
        }

        // Small delay between API calls to be respectful to the Meezan API
        if (total > 1) {
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      this.logger.log(
        `Meezan sync complete in ${elapsed}s — Total: ${total}, Synced: ${synced}, Updated: ${updated}, Failed: ${failed}`,
      );

      return { total, synced, updated, failed, results };
    } catch (error) {
      this.logger.error(
        `Meezan sync cron failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }

  /**
   * Cleans up multiple pending donations for donors on the same day.
   * Logic:
   * 1. Find all donors who have multiple donations (pending or completed) on the current day.
   * 2. For each such donor:
   *    a. Check if they have any 'completed' donations for the current day.
   *    b. If yes, delete ALL 'pending' donations for that donor on that day.
   *    c. If no 'completed' donations, keep the OLDEST 'pending' donation and delete all other 'pending' donations for that donor on that day.
   */
  async cleanupPendingDonations(): Promise<{
    processedDonors: number;
    deletedDonations: number;
    results: any[];
  }> {
    const startTime = Date.now();
    this.logger.log("Starting daily pending donations cleanup...");

    try {
      // 1. Find all donors who have multiple donations (pending or completed) on the current day.
      const donorsWithMultipleDonations = await this.donationRepository
        .createQueryBuilder("donation")
        .select("donation.donor_id", "donor_id")
        .addSelect("COUNT(donation.id)", "donation_count")
        .where("donation.date = CURRENT_DATE")
        .andWhere("donation.donor_id IS NOT NULL")
        .groupBy("donation.donor_id")
        .having("COUNT(donation.id) > 1")
        .getRawMany();

      let processedDonors = 0;
      let deletedDonations = 0;
      const results: any[] = [];

      for (const donorEntry of donorsWithMultipleDonations) {
        processedDonors++;
        const donorId = donorEntry.donor_id;

        // Get all donations for this donor on the current day
        const allDonationsForDonor = await this.donationRepository
          .createQueryBuilder("donation")
          .where("donation.donor_id = :donorId", { donorId })
          .andWhere("donation.date = CURRENT_DATE")
          .orderBy("donation.id", "ASC") // Order by ID to identify the 'first' pending
          .getMany();

        const completedDonations = allDonationsForDonor.filter(
          (d) => d.status === "completed",
        );
        const pendingDonations = allDonationsForDonor.filter(
          (d) => d.status === "pending",
        );

        if (completedDonations.length > 0) {
          // Case 2a: Donor has completed donations, delete all pending
          for (const pending of pendingDonations) {
            await this.donationRepository.delete(pending.id);
            deletedDonations++;
            results.push({
              donorId,
              donationId: pending.id,
              action: "deleted",
              reason: "completed donation exists",
            });
            this.logger.log(
              `Deleted pending donation #${pending.id} for donor ${donorId} (completed donation exists)`,
            );
          }
        } else if (pendingDonations.length > 1) {
          // Case 2b: No completed donations, keep the first pending, delete others
          const firstPending = pendingDonations[0];
          for (let i = 1; i < pendingDonations.length; i++) {
            const pendingToDelete = pendingDonations[i];
            await this.donationRepository.delete(pendingToDelete.id);
            deletedDonations++;
            results.push({
              donorId,
              donationId: pendingToDelete.id,
              action: "deleted",
              reason: "multiple pending, kept first",
              keptDonationId: firstPending.id,
            });
            this.logger.log(
              `Deleted pending donation #${pendingToDelete.id} for donor ${donorId} (kept #${firstPending.id})`,
            );
          }
        }
      }

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      this.logger.log(
        `Daily pending donations cleanup complete in ${elapsed}s — Processed Donors: ${processedDonors}, Deleted Donations: ${deletedDonations}`,
      );

      return { processedDonors, deletedDonations, results };
    } catch (error) {
      this.logger.error(
        `Daily pending donations cleanup cron failed: ${error.message}`,
        error.stack,
      );
      throw error;
    }
  }
}
