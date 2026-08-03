import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationType } from "../notifications/entities/notification.entity";

interface CeoOfficeNotificationPayload {
  title: string;
  message: string;
  link?: string;
  metadata?: any;
  userIds?: number[];
  user?: any;
}

@Injectable()
export class CeoOfficeEventsListener {
  private readonly logger = new Logger(CeoOfficeEventsListener.name);

  constructor(private readonly notificationsService: NotificationsService) {}

  @OnEvent("ceo_note.created")
  async handleNoteCreated(payload: CeoOfficeNotificationPayload) {
    await this.publishNotification(payload);
  }

  @OnEvent("ceo_note.approved")
  async handleNoteApproved(payload: CeoOfficeNotificationPayload) {
    await this.publishNotification(payload);
  }

  @OnEvent("ceo_note.converted_to_task")
  async handleNoteConvertedToTask(payload: CeoOfficeNotificationPayload) {
    await this.publishNotification(payload);
  }

  @OnEvent("task.created")
  async handleTaskCreated(payload: CeoOfficeNotificationPayload) {
    await this.publishNotification(payload);
  }

  @OnEvent("project_command_sheet.created")
  async handleProjectCommandSheetCreated(payload: CeoOfficeNotificationPayload) {
    await this.publishNotification(payload);
  }

  private async publishNotification(payload: CeoOfficeNotificationPayload) {
    try {
      await this.notificationsService.create(
        {
          title: payload.title,
          message: payload.message,
          type: NotificationType.INFO,
          user_id: payload.user?.id,
          link: payload.link,
          metadata: payload.metadata,
        },
        payload.userIds,
        payload.user,
      );
    } catch (error) {
      this.logger.error("Failed to publish CEO office notification", error);
    }
  }
}
