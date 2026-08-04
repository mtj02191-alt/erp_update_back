import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { CeoNote } from "./entities/ceo-note.entity";
import { CeoNoteAudit } from "./entities/ceo-note-audit.entity";
import { ProjectCommandSheet } from "./entities/project-command-sheet.entity";
import { Visitor } from "./entities/visitor.entity";
import { Call } from "./entities/call.entity";
import { WhatsAppMessage } from "./entities/whatsapp.entity";
import { Meeting } from "./entities/meeting.entity";
import { Approval } from "./entities/approval.entity";
import { FollowUp } from "./entities/follow-up.entity";
import { WaitingResponse } from "./entities/waiting-response.entity";
import { Task } from "../tasks/entities/task.entity";
import { User } from "../users/user.entity";
import { CeoNotesService } from "./ceo-notes.service";
import { ProjectCommandSheetsService } from "./project-command-sheets.service";
import { VisitorsService } from "./visitors.service";
import { CeoNoteAuditService } from "./ceo-note-audit.service";
import { CeoNoteCategoryService } from "./ceo-note-category.service";
import { CeoNoteApprovalService } from "./ceo-note-approval.service";
import { CeoNoteConversionService } from "./ceo-note-conversion.service";
import { CeoNoteDashboardService } from "./ceo-note-dashboard.service";
import { CeoNoteReportService } from "./ceo-note-report.service";
import { CeoNoteCronService } from "./ceo-note-cron.service";
import { CeoOfficeEventsListener } from "./ceo-office.events.listener";
import { CeoNotesController } from "./ceo-notes.controller";
import { TasksModule } from "../tasks/tasks.module";
import { AuthModule } from "../auth/auth.module";
import { NotificationsModule } from "../notifications/notifications.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      CeoNote,
      CeoNoteAudit,
      ProjectCommandSheet,
      Visitor,
      Call,
      WhatsAppMessage,
      Meeting,
      Approval,
      FollowUp,
      WaitingResponse,
      Task,
      User,
    ]),
    TasksModule,
    AuthModule,
    NotificationsModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
  ],
  controllers: [
    CeoNotesController,
  ],
  providers: [
    CeoNotesService,
    ProjectCommandSheetsService,
    VisitorsService,
    CeoNoteAuditService,
    CeoNoteCategoryService,
    CeoNoteApprovalService,
    CeoNoteConversionService,
    CeoNoteDashboardService,
    CeoNoteReportService,
    CeoNoteCronService,
    CeoOfficeEventsListener,
  ],
})
export class CeoOfficeModule {}
