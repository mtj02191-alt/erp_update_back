import { Module } from "@nestjs/common";
import { DmsService } from "./dms.service";
import { DmsController } from "./dms.controller";
import { DonorModule } from "./donor/donor.module";
import { UserDonorsModule } from "./user_donors/user_donors.module";
import { PermissionsModule } from "src/permissions";
import { JwtModule } from "@nestjs/jwt";
import { DonationBoxModule } from "./donation_box/donation-box.module";
import { DonationInKindModule } from "./donation_in_kind/donation_in_kind.module";
import { BlinqModule } from "./payment_gateways/blinq/blinq.module";
import { PayfastModule } from "./payment_gateways/payfast/payfast.module";
import { MeezanModule } from "./payment_gateways/meezan/meezan.module";
import { GeographicModule } from "./geographic/geographic.module";
import { RecurringDonationsModule } from "./recurring_donations/recurring_donations.module";
import { SurveysModule } from "./surveys/surveys.module";
import { EventsModule } from "./events/events.module";
import { CampaignsModule } from "./campaigns/campaigns.module";
import { EmailTemplateModule } from "./email_template/email_template.module";

@Module({
  controllers: [DmsController],
  providers: [DmsService],
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
    DonorModule,
    UserDonorsModule,
    DonationBoxModule,
    DonationInKindModule,
    BlinqModule,
    PayfastModule,
    MeezanModule,
    GeographicModule,
    RecurringDonationsModule,
    SurveysModule,
    EventsModule,
    CampaignsModule,
    EmailTemplateModule,
  ],
})
export class DmsModule {}
