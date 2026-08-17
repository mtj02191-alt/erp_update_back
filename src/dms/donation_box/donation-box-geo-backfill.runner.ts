import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { DonationBoxGeoBackfillService } from "./donation-box-geo-backfill.service";

@Injectable()
export class DonationBoxGeoBackfillRunner implements OnModuleInit {
  private readonly logger = new Logger(DonationBoxGeoBackfillRunner.name);

  constructor(
    private readonly donationBoxGeoBackfill: DonationBoxGeoBackfillService,
  ) {}

  async onModuleInit() {
    setTimeout(async () => {
      try {
        await this.donationBoxGeoBackfill.runOnceIfEnabled();
      } catch (error: any) {
        this.logger.error(
          `Donation box geo backfill failed: ${error?.message || error}`,
          error?.stack || undefined,
        );
      }
    }, 7000);
  }
}
