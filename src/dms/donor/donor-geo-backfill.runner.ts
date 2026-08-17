import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { DonorGeoBackfillService } from "./donor-geo-backfill.service";

@Injectable()
export class DonorGeoBackfillRunner implements OnModuleInit {
  private readonly logger = new Logger(DonorGeoBackfillRunner.name);

  constructor(
    private readonly donorGeoBackfill: DonorGeoBackfillService,
  ) {}

  async onModuleInit() {
    setTimeout(async () => {
      try {
        await this.donorGeoBackfill.runOnceIfEnabled();
      } catch (error: any) {
        this.logger.error(
          `Donor geo backfill failed: ${error?.message || error}`,
          error?.stack || undefined,
        );
      }
    }, 6000);
  }
}
