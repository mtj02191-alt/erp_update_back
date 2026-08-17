import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { IsNull, Repository } from "typeorm";
import { DonationBox } from "./entities/donation-box.entity";
import { City } from "../geographic/cities/entities/city.entity";
import { buildDonationBoxGeoSearch } from "./utils/donation-box-geo.util";

@Injectable()
export class DonationBoxGeoBackfillService {
  private readonly logger = new Logger(DonationBoxGeoBackfillService.name);
  private ran = false;

  constructor(
    @InjectRepository(DonationBox)
    private readonly donationBoxRepository: Repository<DonationBox>,
    @InjectRepository(City)
    private readonly cityRepository: Repository<City>,
  ) {}

  /**
   * Build geo_search from route/city/landmark. Disabled by default.
   * Enable with DONATION_BOX_GEO_BACKFILL_ONCE=true
   */
  async runOnceIfEnabled(): Promise<void> {
    if (this.ran) return;
    this.ran = true;

    const enabled =
      String(process.env.DONATION_BOX_GEO_BACKFILL_ONCE || "").toLowerCase() ===
      "true";
    if (!enabled) {
      this.logger.log(
        "Donation box geo backfill skipped (set DONATION_BOX_GEO_BACKFILL_ONCE=true to enable)",
      );
      return;
    }

    const batchSize = Math.max(
      1,
      Number(process.env.DONATION_BOX_GEO_BACKFILL_BATCH_SIZE || 300),
    );

    this.logger.log(
      `Donation box geo backfill started (batchSize=${batchSize}) — rows with geo_search IS NULL`,
    );

    let updated = 0;

    while (true) {
      const boxes = await this.donationBoxRepository.find({
        where: { geo_search: IsNull() } as any,
        relations: ["route", "route.region", "route.country"],
        take: batchSize,
        order: { id: "ASC" },
      });

      if (!boxes.length) break;

      for (const box of boxes) {
        let cityName: string | null = null;
        if (box.city_id) {
          const city = await this.cityRepository.findOne({
            where: { id: box.city_id },
            select: ["id", "name"],
          });
          cityName = city?.name ?? null;
        }

        const geo_search = buildDonationBoxGeoSearch({
          landmark_marketplace: box.landmark_marketplace,
          shop_name: box.shop_name,
          route: box.route,
          city_name: cityName,
        });

        await this.donationBoxRepository.update(box.id, { geo_search });
        updated += 1;
      }
    }

    this.logger.log(
      `Donation box geo backfill finished — updated ${updated} row(s)`,
    );
  }
}
