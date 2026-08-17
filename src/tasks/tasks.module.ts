import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TasksService } from "./tasks.service";
import { TasksController } from "./tasks.controller";
import { Task } from "./entities/task.entity";
import { TaskNotification } from "./entities/task-notification.entity";
import { TaskAttachment } from "./entities/task-attachment.entity";
import { TaskComment } from "./entities/task-comment.entity";
import { TaskActivity } from "./entities/task-activity.entity";
import { TaskTimeEntry } from "./entities/task-time-entry.entity";
import { TaskApproval } from "./entities/task-approval.entity";
import { TaskDueReminder } from "./entities/task-due-reminder.entity";
import { User } from "../users/user.entity";
import { PermissionsModule } from "../permissions";
import { JwtModule } from "@nestjs/jwt";
import { EmailModule } from "../email/email.module";
import { ScheduleModule } from "@nestjs/schedule";
import { TasksCronsService } from "./crons/tasks-crons.service";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Task,
      TaskNotification,
      TaskAttachment,
      TaskComment,
      TaskActivity,
      TaskTimeEntry,
      TaskApproval,
      TaskDueReminder,
      User,
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
    EmailModule,
    ScheduleModule,
    NotificationsModule,
  ],
  controllers: [TasksController],
  providers: [TasksService, TasksCronsService],
  exports: [TasksService],
})
export class TasksModule {}
