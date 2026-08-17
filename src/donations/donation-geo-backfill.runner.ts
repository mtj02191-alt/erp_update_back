import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { DonationGeoBackfillService } from "./donation-geo-backfill.service";

@Injectable()
export class DonationGeoBackfillRunner implements OnModuleInit {
  private readonly logger = new Logger(DonationGeoBackfillRunner.name);

  constructor(
    private readonly donationGeoBackfill: DonationGeoBackfillService,
  ) {}

  async onModuleInit() {
    setTimeout(async () => {
      try {
        await this.donationGeoBackfill.runOnceIfEnabled();
      } catch (error: any) {
        this.logger.error(
          `Donation geo backfill failed: ${error?.message || error}`,
          error?.stack || undefined,
        );
      }
    }, 5000);
  }
}
