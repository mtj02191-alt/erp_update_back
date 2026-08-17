import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { Donation } from "./entities/donation.entity";
import { buildDonationGeoSnapshotForBackfill } from "./utils/donation-geo.util";

@Injectable()
export class DonationGeoBackfillService {
  private readonly logger = new Logger(DonationGeoBackfillService.name);
  private ran = false;

  constructor(
    @InjectRepository(Donation)
    private readonly donationRepository: Repository<Donation>,
  ) {}

  /**
   * Idempotent backfill: fill blank donation geo from linked donor, then build geo_search.
   * Disabled by default — enable with DONATION_GEO_BACKFILL_ONCE=true.
   */
  async runOnceIfEnabled(): Promise<void> {
    if (this.ran) return;
    this.ran = true;

    const enabled =
      String(process.env.DONATION_GEO_BACKFILL_ONCE || "").toLowerCase() ===
      "true";
    if (!enabled) {
      this.logger.log(
        "Donation geo backfill skipped (set DONATION_GEO_BACKFILL_ONCE=true to enable)",
      );
      return;
    }

    const batchSize = Math.max(
      1,
      Number(process.env.DONATION_GEO_BACKFILL_BATCH_SIZE || 300),
    );

    this.logger.log(
      `Donation geo backfill started (batchSize=${batchSize}) — rows with geo_search IS NULL`,
    );

    let updated = 0;

    while (true) {
      const donations = await this.donationRepository.find({
        where: { geo_search: IsNull() } as any,
        relations: ["donor"],
        take: batchSize,
        order: { id: "ASC" },
      });

      if (!donations.length) break;

      for (const donation of donations) {
        const snapshot = buildDonationGeoSnapshotForBackfill(
          donation,
          donation.donor ?? null,
        );
        await this.donationRepository.update(donation.id, snapshot);
        updated += 1;
      }
    }

    this.logger.log(`Donation geo backfill finished — updated ${updated} row(s)`);
  }
}
