import { Module } from "@nestjs/common";
import { RecurringDonationsService } from "./recurring_donations.service";
import { RecurringDonationsController } from "./recurring_donations.controller";

@Module({
  controllers: [RecurringDonationsController],
  providers: [RecurringDonationsService],
})
export class RecurringDonationsModule {}
