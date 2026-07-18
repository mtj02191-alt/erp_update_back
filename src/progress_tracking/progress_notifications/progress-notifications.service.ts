import { Injectable } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { ProgressNotificationLog } from "./progress_notification_log.entity";
import { NotificationChannel } from "../common/progress-tracking.enum";
import { ProgressTracker } from "../progress_trackers/progress_tracker.entity";
import { ProgressTrackerStep } from "../progress_trackers/progress_tracker_step.entity";

type NotificationAttempt = {
  tracker: ProgressTracker;
  step?: ProgressTrackerStep | null;
  channel: NotificationChannel;
  recipient: string;
  subject?: string | null;
  message: string;
  payload?: Record<string, any>;
};

@Injectable()
export class ProgressNotificationsService {
  constructor(
    @InjectRepository(ProgressNotificationLog)
    private readonly logsRepo: Repository<ProgressNotificationLog>,
  ) {}

  async logAttempt(
    params: NotificationAttempt & {
      status: "queued" | "sent" | "failed";
      provider_response?: any;
      failure_reason?: string | null;
      sent_at?: Date | null;
    },
  ) {
    const log = this.logsRepo.create({
      tracker_id: params.tracker?.id || null,
      tracker_step_id: params.step?.id || null,
      donation_id: params.tracker?.donation_id || null,
      channel: params.channel,
      recipient: params.recipient,
      status: params.status,
      subject: params.subject || null,
      message_preview: params.message?.slice(0, 500) || null,
      payload: params.payload || null,
      provider_response: params.provider_response || null,
      failure_reason: params.failure_reason || null,
      sent_at: params.sent_at || null,
    } as any);
    return this.logsRepo.save(log);
  }

  /**
   * Placeholder notification sender.
   * For now we only log attempts; integrations can be wired later.
   */
  async notifyDonorOnStepCompleted(params: {
    tracker: ProgressTracker;
    step: ProgressTrackerStep;
    recipientEmail?: string | null;
    recipientPhone?: string | null;
    publicUrl?: string | null;
  }): Promise<void> {
    const title =
      params.step?.title || params.step?.step_key || "Progress Update";
    const message = params.publicUrl
      ? `Your progress has been updated: ${title}. Track here: ${params.publicUrl}`
      : `Your progress has been updated: ${title}.`;

    if (params.recipientEmail) {
      await this.logAttempt({
        tracker: params.tracker,
        step: params.step,
        channel: NotificationChannel.EMAIL,
        recipient: params.recipientEmail,
        subject: `Progress update: ${title}`,
        message,
        payload: {
          trackerId: params.tracker.id,
          stepId: params.step.id,
          publicUrl: params.publicUrl,
        },
        status: "queued",
      });
    }

    if (params.recipientPhone) {
      await this.logAttempt({
        tracker: params.tracker,
        step: params.step,
        channel: NotificationChannel.WHATSAPP,
        recipient: params.recipientPhone,
        subject: null,
        message,
        payload: {
          trackerId: params.tracker.id,
          stepId: params.step.id,
          publicUrl: params.publicUrl,
        },
        status: "queued",
      });
    }
  }
}
