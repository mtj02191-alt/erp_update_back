import { Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { In, Repository } from "typeorm";
import { DonorFollowup } from "./entities/donor-followup.entity";
import { User } from "../../users/user.entity";
import { EmailService } from "../../email/email.service";
import { ConfigService } from "@nestjs/config";

export interface DonorFollowupCronResult {
  marked_overdue: number;
  reminders_sent: number;
  reminder_failures: number;
}

@Injectable()
export class DonorFollowupCronService {
  private readonly logger = new Logger(DonorFollowupCronService.name);

  constructor(
    @InjectRepository(DonorFollowup)
    private readonly followupRepository: Repository<DonorFollowup>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
  ) {}

  async processDailyFollowups(): Promise<DonorFollowupCronResult> {
    const markedOverdue = await this.markOverdueFollowups();
    const reminderResult = await this.sendFollowupReminders();
    return {
      marked_overdue: markedOverdue,
      reminders_sent: reminderResult.sent,
      reminder_failures: reminderResult.failures,
    };
  }

  /** Persist overdue status on open follow-ups past due date. */
  async markOverdueFollowups(): Promise<number> {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const result = await this.followupRepository
      .createQueryBuilder()
      .update(DonorFollowup)
      .set({ status: "overdue" })
      .where("is_archived = :archived", { archived: false })
      .andWhere("status IN (:...open)", { open: ["pending", "rescheduled"] })
      .andWhere("due_datetime < :startOfToday", { startOfToday })
      .execute();

    return result.affected ?? 0;
  }

  /** Email assignees about today's and overdue donor follow-ups (once per day). */
  async sendFollowupReminders(): Promise<{ sent: number; failures: number }> {
    const now = new Date();
    const startOfToday = new Date(now);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(now);
    endOfToday.setHours(23, 59, 59, 999);

    const followups = await this.followupRepository
      .createQueryBuilder("followup")
      .leftJoinAndSelect("followup.donor", "donor")
      .leftJoinAndSelect("followup.assigned_to", "assigned_to")
      .where("followup.is_archived = :archived", { archived: false })
      .andWhere("followup.status IN (:...statuses)", {
        statuses: ["pending", "rescheduled", "overdue"],
      })
      .andWhere(
        "(followup.due_datetime <= :endOfToday OR followup.status = :overdue)",
        { endOfToday, overdue: "overdue" },
      )
      .andWhere(
        "(followup.last_reminder_sent_at IS NULL OR followup.last_reminder_sent_at < :startOfToday)",
        { startOfToday },
      )
      .orderBy("followup.due_datetime", "ASC")
      .getMany();

    if (!followups.length) {
      return { sent: 0, failures: 0 };
    }

    const byUser = new Map<number, DonorFollowup[]>();
    for (const row of followups) {
      const userId = Number(row.assigned_to_user_id);
      if (!userId) continue;
      const list = byUser.get(userId) || [];
      list.push(row);
      byUser.set(userId, list);
    }

    let sent = 0;
    let failures = 0;
    const frontendBase = (
      this.configService.get<string>("BASE_Frontend_URL") || ""
    ).replace(/\/$/, "");
    const followupsUrl = frontendBase
      ? `${frontendBase}/dms/donor-relationship/follow-ups`
      : "/dms/donor-relationship/follow-ups";

    for (const [userId, rows] of byUser.entries()) {
      const user =
        rows[0]?.assigned_to ||
        (await this.userRepository.findOne({ where: { id: userId } }));
      if (!user?.email) {
        failures += 1;
        continue;
      }

      const overdueCount = rows.filter(
        (r) =>
          r.status === "overdue" ||
          (r.due_datetime && new Date(r.due_datetime) < startOfToday),
      ).length;
      const todayCount = rows.length - overdueCount;

      const lines = rows.slice(0, 15).map((row) => {
        const donorName = row.donor?.name || `Donor #${row.donor_id}`;
        const due = row.due_datetime
          ? new Date(row.due_datetime).toLocaleString("en-GB", {
              day: "2-digit",
              month: "short",
              hour: "2-digit",
              minute: "2-digit",
            })
          : "—";
        const label =
          row.status === "overdue" ||
          (row.due_datetime && new Date(row.due_datetime) < startOfToday)
            ? "Overdue"
            : "Due today";
        return `<li><strong>${label}</strong>: ${row.followup_title} — ${donorName} (due ${due})</li>`;
      });

      const body = `
        <p>Hi ${user.first_name || "there"},</p>
        <p>You have <strong>${rows.length}</strong> donor follow-up(s) requiring attention
        (${overdueCount} overdue, ${todayCount} due today).</p>
        <ul>${lines.join("")}</ul>
        ${rows.length > 15 ? `<p>…and ${rows.length - 15} more.</p>` : ""}
        <p><a href="${followupsUrl}">Open follow-ups in DMS</a></p>
      `;

      const result = await this.emailService.sendDynamicEmail({
        to: user.email,
        subject: `Donor follow-ups reminder (${rows.length})`,
        body,
        data: {},
      });

      if (result.success) {
        sent += 1;
        await this.followupRepository.update(
          { id: In(rows.map((r) => r.id)) },
          { last_reminder_sent_at: now },
        );
      } else {
        failures += 1;
        this.logger.warn(
          `Follow-up reminder failed for user ${userId}: ${result.error || "unknown"}`,
        );
      }
    }

    return { sent, failures };
  }
}
