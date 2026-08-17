import { Module } from "@nestjs/common";
import { OfflineSyncController } from "./offline-sync.controller";
import { OfflineSyncService } from "./offline-sync.service";
import { DonorModule } from "../donor/donor.module";
import { DonationsModule } from "src/donations/donations.module";
import { DonationBoxDonationModule } from "../donation_box/donation_box_donation/donation_box_donation.module";
import { PermissionsModule } from "src/permissions";
import { JwtModule } from "@nestjs/jwt";

@Module({
  imports: [
    DonorModule,
    DonationsModule,
    DonationBoxDonationModule,
    PermissionsModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
  ],
  controllers: [OfflineSyncController],
  providers: [OfflineSyncService],
})
export class OfflineSyncModule {}
 