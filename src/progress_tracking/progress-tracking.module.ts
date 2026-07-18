import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { PermissionsModule } from "../permissions/permissions.module";

import { ProgressWorkflowTemplate } from "./progress_workflow_templates/progress_workflow_template.entity";
import { ProgressWorkflowTemplateStep } from "./progress_workflow_templates/progress_workflow_template_step.entity";
import { ProgressTracker } from "./progress_trackers/progress_tracker.entity";
import { ProgressTrackerStep } from "./progress_trackers/progress_tracker_step.entity";
import { ProgressStepEvidence } from "./progress_trackers/progress_step_evidence.entity";
import { ProgressNotificationLog } from "./progress_notifications/progress_notification_log.entity";

import { ProgressWorkflowTemplatesModule } from "./progress_workflow_templates/progress-workflow-templates.module";
import { ProgressTrackersModule } from "./progress_trackers/progress-trackers.module";
import { ProgressNotificationsModule } from "./progress_notifications/progress-notifications.module";
import { ProgressReportsModule } from "./progress_reports/progress-reports.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProgressWorkflowTemplate,
      ProgressWorkflowTemplateStep,
      ProgressTracker,
      ProgressTrackerStep,
      ProgressStepEvidence,
      ProgressNotificationLog,
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
    ProgressWorkflowTemplatesModule,
    ProgressTrackersModule,
    ProgressNotificationsModule,
    ProgressReportsModule,
  ],
  exports: [
    ProgressWorkflowTemplatesModule,
    ProgressTrackersModule,
    ProgressNotificationsModule,
    ProgressReportsModule,
  ],
})
export class ProgressTrackingModule {}
