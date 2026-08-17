import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { Donor } from "./entities/donor.entity";
import { buildDonorGeoSearch } from "./utils/donor-geo.util";

@Injectable()
export class DonorGeoBackfillService {
  private readonly logger = new Logger(DonorGeoBackfillService.name);
  private ran = false;

  constructor(
    @InjectRepository(Donor)
    private readonly donorRepository: Repository<Donor>,
  ) {}

  /**
   * Idempotent backfill: build geo_search from existing donor geo columns only.
   * Disabled by default — enable with DONOR_GEO_BACKFILL_ONCE=true.
   */
  async runOnceIfEnabled(): Promise<void> {
    if (this.ran) return;
    this.ran = true;

    const enabled =
      String(process.env.DONOR_GEO_BACKFILL_ONCE || "").toLowerCase() === "true";
    if (!enabled) {
      this.logger.log(
        "Donor geo backfill skipped (set DONOR_GEO_BACKFILL_ONCE=true to enable)",
      );
      return;
    }

    const batchSize = Math.max(
      1,
      Number(process.env.DONOR_GEO_BACKFILL_BATCH_SIZE || 300),
    );

    this.logger.log(
      `Donor geo backfill started (batchSize=${batchSize}) — rows with geo_search IS NULL`,
    );

    let updated = 0;

    while (true) {
      const donors = await this.donorRepository.find({
        where: { geo_search: IsNull() } as any,
        take: batchSize,
        order: { id: "ASC" },
      });

      if (!donors.length) break;

      for (const donor of donors) {
        const geo_search = buildDonorGeoSearch(donor);
        await this.donorRepository.update(donor.id, { geo_search });
        updated += 1;
      }
    }

    this.logger.log(`Donor geo backfill finished — updated ${updated} row(s)`);
  }
}
