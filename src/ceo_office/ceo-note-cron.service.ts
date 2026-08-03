import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { Repository, LessThan, Not, In, Between } from "typeorm";
import { InjectRepository } from "@nestjs/typeorm";
import { CeoNote, CeoNoteStatus, CeoNoteCategory } from "./entities/ceo-note.entity";
import { User } from "../users/user.entity";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationType } from "../notifications/entities/notification.entity";

@Injectable()
export class CeoNoteCronService {
  private readonly logger = new Logger(CeoNoteCronService.name);

  constructor(
    @InjectRepository(CeoNote)
    private readonly ceoNoteRepository: Repository<CeoNote>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Daily overdue check - Runs at 8 AM every day
   * Sends notifications for notes that are past their due date
   */
  @Cron("0 8 * * *", {
    name: "ceo-note-overdue-check",
    timeZone: "Asia/Karachi",
  })
  async checkOverdueNotes() {
    try {
      this.logger.log("Starting overdue notes check...");

      const overdueNotes = await this.ceoNoteRepository.find({
        where: {
          due_date: LessThan(new Date()),
          status: Not(In([
            CeoNoteStatus.COMPLETED,
            CeoNoteStatus.CLOSED,
            CeoNoteStatus.CANCELLED,
            CeoNoteStatus.APPROVED,
          ])),
        },
        relations: ["assigned_users", "created_by"],
      });

      this.logger.log(`Found ${overdueNotes.length} overdue notes`);

      for (const note of overdueNotes) {
        const userIds: number[] = [];
        if (note.created_by_id) userIds.push(note.created_by_id);
        if (note.assigned_user_ids?.length) {
          note.assigned_user_ids.forEach((id) => {
            if (!userIds.includes(id)) userIds.push(id);
          });
        }

        if (userIds.length > 0) {
          try {
            await this.notificationsService.create(
              {
                title: "Overdue CEO Note",
                message: `CEO note "${note.title}" is overdue (due date: ${new Date(note.due_date).toLocaleDateString()}).`,
                type: NotificationType.WARNING,
                link: `/ceo-office/notes/${note.id}`,
                metadata: { noteId: note.id, type: "overdue" },
              },
              userIds,
            );
          } catch (err) {
            this.logger.error(`Failed to send overdue notification for note ${note.id}`, err);
          }
        }
      }

      this.logger.log("Overdue notes check completed");
    } catch (error) {
      this.logger.error("Error in overdue notes check", error);
    }
  }

  /**
   * Due date reminders - Runs at 9 AM every day
   * Sends notifications for notes due within 2 days
   */
  @Cron("0 9 * * *", {
    name: "ceo-note-due-reminder",
    timeZone: "Asia/Karachi",
  })
  async checkUpcomingDueDates() {
    try {
      this.logger.log("Starting due date reminder check...");

      const now = new Date();
      const twoDaysFromNow = new Date();
      twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2);

      const upcomingNotes = await this.ceoNoteRepository.find({
        where: {
          due_date: Between(now, twoDaysFromNow),
          status: Not(In([
            CeoNoteStatus.COMPLETED,
            CeoNoteStatus.CLOSED,
            CeoNoteStatus.CANCELLED,
            CeoNoteStatus.APPROVED,
          ])),
        },
        relations: ["assigned_users", "created_by"],
      });

      this.logger.log(`Found ${upcomingNotes.length} notes due within 2 days`);

      for (const note of upcomingNotes) {
        const userIds: number[] = [];
        if (note.created_by_id) userIds.push(note.created_by_id);
        if (note.assigned_user_ids?.length) {
          note.assigned_user_ids.forEach((id) => {
            if (!userIds.includes(id)) userIds.push(id);
          });
        }

        if (userIds.length > 0) {
          try {
            await this.notificationsService.create(
              {
                title: "CEO Note Due Soon",
                message: `CEO note "${note.title}" is due on ${new Date(note.due_date).toLocaleDateString()}.`,
                type: NotificationType.INFO,
                link: `/ceo-office/notes/${note.id}`,
                metadata: { noteId: note.id, type: "due_reminder" },
              },
              userIds,
            );
          } catch (err) {
            this.logger.error(`Failed to send due reminder for note ${note.id}`, err);
          }
        }
      }

      this.logger.log("Due date reminder check completed");
    } catch (error) {
      this.logger.error("Error in due date reminder check", error);
    }
  }

  /**
   * Waiting response reminders - Runs at 10 AM every day
   * Sends reminders for notes that have been waiting for a response
   */
  @Cron("0 10 * * *", {
    name: "ceo-note-waiting-response-reminder",
    timeZone: "Asia/Karachi",
  })
  async checkWaitingResponses() {
    try {
      this.logger.log("Starting waiting response check...");

      const waitingNotes = await this.ceoNoteRepository.find({
        where: {
          status: CeoNoteStatus.WAITING_RESPONSE,
        },
        relations: ["assigned_users", "created_by"],
      });

      this.logger.log(`Found ${waitingNotes.length} waiting response notes`);

      for (const note of waitingNotes) {
        const userIds: number[] = [];
        if (note.created_by_id) userIds.push(note.created_by_id);
        if (note.assigned_user_ids?.length) {
          note.assigned_user_ids.forEach((id) => {
            if (!userIds.includes(id)) userIds.push(id);
          });
        }

        if (userIds.length > 0) {
          try {
            await this.notificationsService.create(
              {
                title: "Waiting for Response",
                message: `CEO note "${note.title}" is still waiting for a response.`,
                type: NotificationType.INFO,
                link: `/ceo-office/notes/${note.id}`,
                metadata: { noteId: note.id, type: "waiting_response_reminder" },
              },
              userIds,
            );
          } catch (err) {
            this.logger.error(`Failed to send waiting response reminder for note ${note.id}`, err);
          }
        }
      }

      this.logger.log("Waiting response check completed");
    } catch (error) {
      this.logger.error("Error in waiting response check", error);
    }
  }
}
