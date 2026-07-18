import { Module } from "@nestjs/common";
import { DonationInKindService } from "./donation_in_kind.service";
import { DonationInKindController } from "./donation_in_kind.controller";
import { DonationInKindItemsModule } from "./donation_in_kind_items/donation_in_kind_items.module";

@Module({
  controllers: [DonationInKindController],
  providers: [DonationInKindService],
  imports: [DonationInKindItemsModule],
})
export class DonationInKindModule {}
