import { Module } from "@nestjs/common";
import { ConfigModule } from "@nestjs/config";
import { EmailService } from "./email.service";
import { DonationReceiptsService } from "./donationReceipts.service";

@Module({
  imports: [ConfigModule],
  providers: [EmailService, DonationReceiptsService],
  exports: [EmailService, DonationReceiptsService],
})
export class EmailModule {}
