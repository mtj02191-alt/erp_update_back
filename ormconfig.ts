import { DataSource } from 'typeorm';
import * as dotenv from 'dotenv';
import { ProgressWorkflowTemplate } from './src/progress_tracking/progress_workflow_templates/progress_workflow_template.entity';
import { ProgressWorkflowTemplateStep } from './src/progress_tracking/progress_workflow_templates/progress_workflow_template_step.entity';
import { ProgressTracker } from './src/progress_tracking/progress_trackers/progress_tracker.entity';
import { ProgressTrackerStep } from './src/progress_tracking/progress_trackers/progress_tracker_step.entity';
import { ProgressStepEvidence } from './src/progress_tracking/progress_trackers/progress_step_evidence.entity';
import { ProgressNotificationLog } from './src/progress_tracking/progress_notifications/progress_notification_log.entity';
import { Donation } from './src/donations/entities/donation.entity'; // Import Donation entity

dotenv.config();

export const AppDataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/ddr_db',
  ssl: process.env.SSL === 'production',
  entities: [
    ProgressWorkflowTemplate,
    ProgressWorkflowTemplateStep,
    ProgressTracker,
    ProgressTrackerStep,
    ProgressStepEvidence,
    ProgressNotificationLog,
    Donation, // Include Donation entity for relations
    // Add other existing entities here if needed for relations
  ],
  migrations: ['migrations/*.ts'],
  synchronize: false, // Set to false for migrations
  logging: true,
});
