import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { ManualRecurringPledge } from "./entities/manual-recurring-pledge.entity";
import { ManualRecurringPledgeLine } from "./entities/manual-recurring-pledge-line.entity";
import { CampaignDonationItem } from "../campaigns/entities/campaign-donation-item.entity";
import { ManualRecurringService } from "./manual-recurring.service";
import { ManualRecurringReminderService } from "./manual-recurring-reminder.service";
import { ManualRecurringController } from "./manual-recurring.controller";
import { Donor } from "../donor/entities/donor.entity";
import { Donation } from "../../donations/entities/donation.entity";
import { RecurringDonation } from "../../donations/recurring_donations/entities/recurring-donation.entity";
import { Campaign } from "../campaigns/entities/campaign.entity";
import { EmailTemplateModule } from "../email_template/email_template.module";
import { EmailModule } from "../../email/email.module";
import { WhatsAppService } from "../../utils/services/whatsapp.service";
import { RecurringDonationsStripeModule } from "../../donations/recurring_donations/recurring-donations-stripe.module";

@Module({
  imports: [
    ConfigModule,
    EmailTemplateModule,
    EmailModule,
    RecurringDonationsStripeModule,
    TypeOrmModule.forFeature([
      ManualRecurringPledge,
      ManualRecurringPledgeLine,
      CampaignDonationItem,
      Donor,
      Donation,
      RecurringDonation,
      Campaign,
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
  ],
  controllers: [ManualRecurringController],
  providers: [
    ManualRecurringService,
    ManualRecurringReminderService,
    WhatsAppService,
  ],
  exports: [ManualRecurringService, ManualRecurringReminderService],
})
export class ManualRecurringModule {}
