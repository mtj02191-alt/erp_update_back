import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RecurringDonation } from "./entities/recurring-donation.entity";
import { RecurringDonationsStripeService } from "./recurring-donations-stripe.service";
import { RecurringDonationsLedgerService } from "./recurring-donations-ledger.service";
import { RecurringDonationsController } from "./recurring-donations.controller";
import { Donation } from "../entities/donation.entity";
import { Donor } from "src/dms/donor/entities/donor.entity";
import { StripeService } from "../stripe.service";
import { PermissionsModule } from "src/permissions";
import { JwtModule } from "@nestjs/jwt";
import { EmailModule } from "../../email/email.module";
import { WhatsAppService } from "../../utils/services/whatsapp.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([RecurringDonation, Donation, Donor]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
    EmailModule,
  ],
  controllers: [RecurringDonationsController],
  providers: [
    RecurringDonationsStripeService,
    RecurringDonationsLedgerService,
    StripeService,
    WhatsAppService,
  ],
  exports: [RecurringDonationsStripeService, RecurringDonationsLedgerService],
})
export class RecurringDonationsStripeModule {}
