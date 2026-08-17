import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { PermissionsModule } from "../../permissions/permissions.module";
import { Donation } from "../../donations/entities/donation.entity";
import { ProgressWorkflowTemplate } from "../progress_workflow_templates/progress_workflow_template.entity";
import { ProgressTracker } from "../progress_trackers/progress_tracker.entity";
import { ProgressReportsController } from "./progress-reports.controller";
import { ProgressReportsService } from "./progress-reports.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([Donation, ProgressWorkflowTemplate, ProgressTracker]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
  ],
  controllers: [ProgressReportsController],
  providers: [ProgressReportsService],
  exports: [ProgressReportsService],
})
export class ProgressReportsModule {}

