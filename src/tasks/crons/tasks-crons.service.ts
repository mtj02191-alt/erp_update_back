import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { TasksService } from "../tasks.service";

@Injectable()
export class TasksCronsService {
  private readonly logger = new Logger(TasksCronsService.name);

  constructor(private readonly tasksService: TasksService) {}

  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handleOverdueEscalation() {
    try {
      const count = await this.tasksService.overdueEscalation();
      this.logger.log(`Overdue escalation processed for ${count} tasks`);
    } catch (error) {
      this.logger.error(`Overdue escalation failed: ${error?.message}`);
    }
  }

  @Cron(CronExpression.EVERY_DAY_AT_2AM)
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
