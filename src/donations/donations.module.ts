import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DonationsService } from "./donations.service";
import { DonationsController } from "./donations.controller";
import { PublicDonationsController } from "./public-donations.controller";
import { MigrationController } from "./migration.controller";
import { DonationsSummaryController } from "./donations-summary.controller";
import { CommunicationController } from "../utils/controllers/communication.controller";
import { Donation } from "./entities/donation.entity";
import { DonationInKind } from "../dms/donation_in_kind/entities/donation_in_kind.entity";
import { User } from "../users/user.entity";
import { City } from "../dms/geographic/cities/entities/city.entity";
import { JwtModule } from "@nestjs/jwt";
import { PermissionsModule } from "src/permissions/permissions.module";
import { EmailModule } from "../email/email.module";
import { PayfastService } from "./payfast.service";
import { StripeService } from "./stripe.service";
import { DonorModule } from "../dms/donor/donor.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { WhatsAppService } from "src/utils/services/whatsapp.service";
import { RecurringDonation } from "src/dms/recurring_donations/entities/recurring_donation.entity";
import { CampaignsModule } from "../dms/campaigns/campaigns.module";
import { DashboardModule } from "../dashboard/dashboard.module";
import { DonationsReceiptsService } from "./receipts.service";
import { ProgressTrackersModule } from "../progress_tracking/progress_trackers/progress-trackers.module";
import { ProgressBatchesModule } from "../progress_tracking/progress_batches/progress-batches.module";
import { ProgressWorkflowTemplate } from "../progress_tracking/progress_workflow_templates/progress_workflow_template.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Donation,
      DonationInKind,
      User,
      RecurringDonation,
      City,
      ProgressWorkflowTemplate,
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
    EmailModule,
    DonorModule,
    NotificationsModule,
    CampaignsModule,
    DashboardModule,
    ProgressTrackersModule,
    ProgressBatchesModule,
  ],
  controllers: [
    DonationsController,
    PublicDonationsController,
    MigrationController,
    DonationsSummaryController,
    CommunicationController,
  ],
  providers: [
    DonationsService,
    DonationsReceiptsService,
    PayfastService,
    StripeService,
    WhatsAppService,
  ],
  exports: [DonationsService],
})
export class DonationsModule {}
