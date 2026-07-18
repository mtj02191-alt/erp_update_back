import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProgressWorkflowTemplate } from "../progress_workflow_templates/progress_workflow_template.entity";
import { ProgressWorkflowBatch } from "./progress_workflow_batch.entity";
import { DonationBatchAllocation } from "./donation_batch_allocation.entity";
import { ProgressBatchesService } from "./progress-batches.service";
import { ProgressBatchesController } from "./progress-batches.controller";
import { ProgressTracker } from "../progress_trackers/progress_tracker.entity";
import { ProgressBatchStepEvidence } from "./progress_batch_step_evidence.entity";
import { JwtModule } from "@nestjs/jwt";
import { PermissionsModule } from "src/permissions/permissions.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProgressWorkflowTemplate,
      ProgressWorkflowBatch,
      DonationBatchAllocation,
      ProgressTracker,
      ProgressBatchStepEvidence,
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
  ],
  controllers: [ProgressBatchesController],
  providers: [ProgressBatchesService],
  exports: [ProgressBatchesService],
})
export class ProgressBatchesModule {}
