import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DonationsService } from "./donations.service";
import { DonationsController } from "./donations.controller";
import { PublicDonationsController } from "./public-donations.controller";
import { MigrationController } from "./migration.controller";
import { DonationsSummaryController } from "./donations-summary.controller";
import { CommunicationController } from "../utils/controllers/communication.controller";
import { Donation } from "./entities/donation.entity";
import { DonationAttachment } from "./entities/donation-attachment.entity";
import { DonationInKind } from "../dms/donation_in_kind/entities/donation_in_kind.entity";
import { User } from "../users/user.entity";
import { JwtModule } from "@nestjs/jwt";
import { PermissionsModule } from "src/permissions/permissions.module";
import { EmailModule } from "../email/email.module";
import { PayfastService } from "./payfast.service";
import { StripeService } from "./stripe.service";
import { AlfalahService } from "./alfalah/alfalah.service";
import { JazzCashService } from "./jazzcash/jazzcash.service";
import { DonorModule } from "../dms/donor/donor.module";
import { NotificationsModule } from "../notifications/notifications.module";
import { WhatsAppService } from "src/utils/services/whatsapp.service";
import { RecurringDonationPlan } from "./recurring_donations/entities/recurring-donation-plan.entity";
import { CampaignsModule } from "../dms/campaigns/campaigns.module";
import { DashboardModule } from "../dashboard/dashboard.module";
import { DonationsReceiptsService } from "./receipts.service";
import { ProgressTrackersModule } from "../progress_tracking/progress_trackers/progress-trackers.module";
import { ProgressBatchesModule } from "../progress_tracking/progress_batches/progress-batches.module";
import { ProgressWorkflowTemplate } from "../progress_tracking/progress_workflow_templates/progress_workflow_template.entity";
import { DonationAuditModule } from "./audit/donation-audit.module";
import { RecurringDonationsStripeModule } from "./recurring_donations/recurring-donations-stripe.module";
import { DonationGeoBackfillService } from "./donation-geo-backfill.service";
import { DonationGeoBackfillRunner } from "./donation-geo-backfill.runner";
import { DonationPendingFollowUpService } from "./donation-pending-follow-up.service";
import { Task } from "../tasks/entities/task.entity";
import { TasksModule } from "../tasks/tasks.module";
import { ManualRecurringModule } from "../dms/manual_recurring/manual-recurring.module";

@Module({
  imports: [
    DonationAuditModule,
    RecurringDonationsStripeModule,
    TasksModule,
    ManualRecurringModule,
    TypeOrmModule.forFeature([
      Donation,
      DonationAttachment,
      DonationInKind,
      User,
      RecurringDonationPlan,
      ProgressWorkflowTemplate,
      Task,
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
    AlfalahService,
    JazzCashService,
    WhatsAppService,
    DonationGeoBackfillService,
    DonationGeoBackfillRunner,
    DonationPendingFollowUpService,
  ],
  exports: [DonationsService, DonationPendingFollowUpService],
})
export class DonationsModule {}
