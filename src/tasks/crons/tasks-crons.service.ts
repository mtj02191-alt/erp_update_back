import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { TasksService } from "../tasks.service";

@Injectable()
export class TasksCronsService {
  private readonly logger = new Logger(TasksCronsService.name);

  constructor(private readonly tasksService: TasksService) {}

  @Cron(CronExpression.EVERY_HOUR, { timeZone: "Asia/Karachi" })
  async handleDueReminders() {
    try {
      const count = await this.tasksService.processDueReminders();
      if (count > 0) {
        this.logger.log(`Processed ${count} task due reminder(s)`);
      }
    } catch (error) {
      this.logger.error(`Task due reminders failed: ${error?.message}`);
    }
  }

  @Cron(CronExpression.EVERY_HOUR, { timeZone: "Asia/Karachi" })
  async handleRecurringTaskCutoff() {
    try {
      const count = await this.tasksService.finalizeRecurringCutoffs();
      if (count > 0) {
        this.logger.log(`Finalized ${count} recurring task cutoff(s)`);
      }
    } catch (error) {
      this.logger.error(`Recurring task cutoff failed: ${error?.message}`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_1AM, { timeZone: "Asia/Karachi" })
  async handleOverdueEscalation() {
    try {
      const count = await this.tasksService.overdueEscalation();
      this.logger.log(`Overdue escalation processed for ${count} tasks`);
    } catch (error) {
      this.logger.error(`Overdue escalation failed: ${error?.message}`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM, { timeZone: "Asia/Karachi" })
  async handleRecurrence() {
    try {
      const count = await this.tasksService.processRecurrence();
      if (count > 0) {
        this.logger.log(`Recurrence processed: ${count} new tasks created`);
      }
    } catch (error) {
      this.logger.error(`Recurrence processing failed: ${error?.message}`);
    }
  }
}
