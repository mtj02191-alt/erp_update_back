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
import { SurveysModule } from "./surveys/surveys.module";
import { EventsModule } from "./events/events.module";
import { CampaignsModule } from "./campaigns/campaigns.module";
import { EmailTemplateModule } from "./email_template/email_template.module";
import { CrowdFundingModule } from './crowd_funding/crowd_funding.module';
import { AppealsModule } from './appeals/appeals.module';
import { AppealsBenificiariesModule } from './appeals_benificiaries/appeals_benificiaries.module';
import { AppealUpdatesModule } from './appeal_updates/appeal_updates.module';
import { AppealMediaModule } from './appeal_media/appeal_media.module';
import { SocialMediaModule } from './social_media/social_media.module';
import { OfflineSyncModule } from './offline-sync/offline-sync.module';
import { ReceiptTemplatesModule } from './receipt_templates/receipt_templates.module';
import { ReconciliationModule } from './reconciliation/reconciliation.module';
import { DonorRelationshipModule } from './donor_relationship/donor-relationship.module';
import { CommunicationModule } from './communication/communication.module';
import { ManualRecurringModule } from './manual_recurring/manual-recurring.module';
import { DmsTodosModule } from './todos/dms-todos.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { AidModule } from './aid/aid.module';
import { WebsiteDonationProjectsModule } from './website_donation_projects/website-donation-projects.module';
import { WebsiteHomeHeroModule } from './website_home_hero/website-home-hero.module';

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
    OrganizationsModule,
    AidModule,
    UserDonorsModule,
    DonationBoxModule,
    DonationInKindModule,
    BlinqModule,
    PayfastModule,
    MeezanModule,
    GeographicModule,
    SurveysModule,
    EventsModule,
    CampaignsModule,
    EmailTemplateModule,
    CrowdFundingModule,
    AppealsModule,
    AppealsBenificiariesModule,
    AppealUpdatesModule,
    AppealMediaModule,
    SocialMediaModule,
    OfflineSyncModule,
    ReceiptTemplatesModule,
    ReconciliationModule,
    DonorRelationshipModule,
    CommunicationModule,
    ManualRecurringModule,
    DmsTodosModule,
    WebsiteDonationProjectsModule,
    WebsiteHomeHeroModule,
  ],
})
export class DmsModule {}
