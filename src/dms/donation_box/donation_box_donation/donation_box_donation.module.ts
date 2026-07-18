import { Module } from "@nestjs/common";
import { DonationBoxDonationService } from "./donation_box_donation.service";
import { DonationBoxDonationController } from "./donation_box_donation.controller";
import { DonationBoxModule } from "../donation-box.module";
import { DonationBoxDonation } from "./entities/donation_box_donation.entity";
import { DonationBox } from "../entities/donation-box.entity";
import { City } from "../../geographic/cities/entities/city.entity";
import { User } from "../../../users/user.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { PermissionsModule } from "src/permissions";
import { DashboardModule } from "../../../dashboard/dashboard.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([DonationBox, DonationBoxDonation, City, User]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
    DashboardModule,
  ],
  controllers: [DonationBoxDonationController],
  providers: [DonationBoxDonationService],
})
export class DonationBoxDonationModule {}
