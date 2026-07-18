import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { Donation } from "src/donations/entities/donation.entity";
import { DonorAuthModule } from "src/donor_auth/donor-auth.module";
import { DonorPortalDonationsController } from "./donor-portal-donations.controller";
import { DonorPortalDonationsService } from "./donor-portal-donations.service";
import { ProgressTracker } from "src/progress_tracking/progress_trackers/progress_tracker.entity";
import { ProgressTrackersModule } from "src/progress_tracking/progress_trackers/progress-trackers.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Donation, ProgressTracker]),
    DonorAuthModule,
    ProgressTrackersModule,
  ],
  controllers: [DonorPortalDonationsController],
  providers: [DonorPortalDonationsService],
})
export class DonorPortalModule {}
