import { Module } from "@nestjs/common";
import { DonationInKindItemsService } from "./donation_in_kind_items.service";
import { DonationInKindItemsController } from "./donation_in_kind_items.controller";
import { DonationInKindItem } from "./entities/donation_in_kind_item.entity";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { PermissionsModule } from "src/permissions";
import { ProcurementsModule } from "src/procurements/procurements.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([DonationInKindItem]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
    ProcurementsModule,
  ],
  controllers: [DonationInKindItemsController],
  providers: [DonationInKindItemsService],
  exports: [DonationInKindItemsService],
})
export class DonationInKindItemsModule {}
