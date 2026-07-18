import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { CeoNote } from "./entities/ceo-note.entity";
import { CeoNoteAudit } from "./entities/ceo-note-audit.entity";
import { ProjectCommandSheet } from "./entities/project-command-sheet.entity";
import { Visitor } from "./entities/visitor.entity";
import { Call } from "./entities/call.entity";
import { WhatsAppMessage } from "./entities/whatsapp.entity";
import { Task } from "../tasks/entities/task.entity";
import { User } from "../users/user.entity";
import { CeoNotesService } from "./ceo-notes.service";
import { ProjectCommandSheetsService } from "./project-command-sheets.service";
import { VisitorsService } from "./visitors.service";
import { CeoNotesController } from "./ceo-notes.controller";
import { ProjectCommandSheetsController } from "./project-command-sheets.controller";
import { VisitorsController } from "./visitors.controller";
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
    ProjectCommandSheetsController,
    VisitorsController,
  ],
  providers: [CeoNotesService, ProjectCommandSheetsService, VisitorsService],
})
export class CeoOfficeModule {}
