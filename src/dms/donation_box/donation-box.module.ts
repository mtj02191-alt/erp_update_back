import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { DonationBoxService } from "./donation-box.service";
import { DonationBoxController } from "./donation-box.controller";
import { DonationBox } from "./entities/donation-box.entity";
import { PermissionsModule } from "../../permissions/permissions.module";
import { DonationBoxDonationModule } from "./donation_box_donation/donation_box_donation.module";
import { Route } from "../geographic/routes/entities/route.entity";
import { City } from "../geographic/cities/entities/city.entity";
import { Region } from "../geographic/regions/entities/region.entity";
import { User } from "../../users/user.entity";
import { DonationBoxAuditModule } from "./audit/donation-box-audit.module";
import { DonationBoxGeoBackfillService } from "./donation-box-geo-backfill.service";
import { DonationBoxGeoBackfillRunner } from "./donation-box-geo-backfill.runner";

@Module({
  imports: [
    DonationBoxAuditModule,
    TypeOrmModule.forFeature([
      DonationBox,
      Route,
      City,
      Region,
      User,
      // PermissionsEntity,
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
    DonationBoxDonationModule,
  ],
  controllers: [DonationBoxController],
  providers: [
    DonationBoxService,
    DonationBoxGeoBackfillService,
    DonationBoxGeoBackfillRunner,
  ],
  exports: [DonationBoxService, TypeOrmModule], // Export for other modules
})
export class DonationBoxModule {}
