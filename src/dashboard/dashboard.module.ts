import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { Donation } from "../donations/entities/donation.entity";
import { DonationBoxDonation } from "../dms/donation_box/donation_box_donation/entities/donation_box_donation.entity";
import { DonationBox } from "../dms/donation_box/entities/donation-box.entity";
import { Donor } from "../dms/donor/entities/donor.entity";
import { Event } from "../dms/events/entities/event.entity";
import { Campaign } from "../dms/campaigns/entities/campaign.entity";
import { PermissionsModule } from "../permissions/permissions.module";
import { DashboardAggregateService } from "./dashboard-aggregate.service";
import { DashboardController } from "./dashboard.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Donation,
      DonationBoxDonation,
      DonationBox,
      Donor,
      Event,
      Campaign,
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardAggregateService],
  exports: [DashboardAggregateService],
})
export class DashboardModule {}
