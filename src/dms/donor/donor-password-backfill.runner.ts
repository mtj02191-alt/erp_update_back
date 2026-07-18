import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { DonorPasswordBackfillService } from "./donor-password-backfill.service";

@Injectable()
export class DonorPasswordBackfillRunner implements OnModuleInit {
  private readonly logger = new Logger(DonorPasswordBackfillRunner.name);

  constructor(
    private readonly donorPasswordBackfill: DonorPasswordBackfillService,
  ) {}

  async onModuleInit() {
    // Run after app bootstrap settles
    setTimeout(async () => {
      try {
        await this.donorPasswordBackfill.runOnceIfEnabled();
      } catch (e: any) {
        this.logger.error(
          `Backfill failed: ${e?.message || e}`,
          e?.stack || undefined,
        );
      }
    }, 5000);
  }
}
