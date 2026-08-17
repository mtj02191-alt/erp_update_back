import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { Donation } from "./entities/donation.entity";
import { User, UserRole, Department } from "../users/user.entity";
import { TasksService } from "../tasks/tasks.service";
import { Task } from "../tasks/entities/task.entity";
import {
  TaskPriority,
  TaskType,
  TaskWorkflowType,
} from "../tasks/entities/task.entity";
import { CreateTaskDto } from "../tasks/dto/create-task.dto";
import {
  DONATION_PENDING_MOV_ITEMS,
  MIN_DONATION_FOLLOW_UP_AMOUNT,
  PENDING_DONATION_FOLLOW_UP_MINUTES,
  WEBSITE_DONATION_FOLLOW_UP_STATUSES,
  donationPendingTaskProjectId,
  isPktToday,
  isWebsiteDonationFollowUpStatus,
  resolveDonationFollowUpDate,
} from "./donation-pending-follow-up.constants";

export interface PendingDonationFollowUpOptions {
  /** Donation `date` column (YYYY-MM-DD). Defaults to today in PKT. */
  donationDate?: string;
  /**
   * When true (default for cron / manual today), only donations created
   * at least PENDING_DONATION_FOLLOW_UP_MINUTES ago are eligible.
   */
  enforcePendingMinutes?: boolean;
}

export interface PendingDonationFollowUpResult {
  scanned: number;
  created: number;
  skippedExisting: number;
  skippedNoAgents: number;
  skippedStatusChanged: number;
  errors: number;
  taskIds: number[];
  donationDate: string;
  enforcePendingMinutes: boolean;
}

@Injectable()
export class DonationPendingFollowUpService {
  private readonly logger = new Logger(DonationPendingFollowUpService.name);

  constructor(
    @InjectRepository(Donation)
    private readonly donationRepository: Repository<Donation>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly tasksService: TasksService,
  ) {}

  async processPendingDonationFollowUps(
    options: PendingDonationFollowUpOptions = {},
  ): Promise<PendingDonationFollowUpResult> {
    let donationDate: string;
    try {
      donationDate = resolveDonationFollowUpDate(options.donationDate);
    } catch {
      throw new BadRequestException("date must be YYYY-MM-DD");
    }

    const enforcePendingMinutes =
      options.enforcePendingMinutes ?? isPktToday(donationDate);

    const result: PendingDonationFollowUpResult = {
      scanned: 0,
      created: 0,
      skippedExisting: 0,
      skippedNoAgents: 0,
      skippedStatusChanged: 0,
      errors: 0,
      taskIds: [],
      donationDate,
      enforcePendingMinutes,
    };

    const qb = this.donationRepository
      .createQueryBuilder("donation")
      .leftJoinAndSelect("donation.donor", "donor")
      .where("LOWER(donation.donation_source) = :source", { source: "website" })
      .andWhere("LOWER(donation.status) IN (:...statuses)", {
        statuses: WEBSITE_DONATION_FOLLOW_UP_STATUSES,
      })
      .andWhere("donation.is_archived = :archived", { archived: false })
      .andWhere("donation.date = :donationDate", { donationDate })
      .andWhere("donation.amount >= :minAmount", {
        minAmount: MIN_DONATION_FOLLOW_UP_AMOUNT,
      })
      .orderBy("donation.created_at", "ASC")
      .take(100);

    if (enforcePendingMinutes) {
      const cutoff = new Date(
        Date.now() - PENDING_DONATION_FOLLOW_UP_MINUTES * 60 * 1000,
      );
      qb.andWhere("donation.created_at <= :cutoff", { cutoff });
    }

    const candidates = await qb.getMany();

    result.scanned = candidates.length;
    if (candidates.length === 0) {
      return result;
    }

    const agentIds = await this.getCallCenterAgentIds();
    if (agentIds.length === 0) {
      this.logger.warn(
        "No active Fund Raising call center agents found — skipping pending donation follow-up task creation",
      );
      result.skippedNoAgents = candidates.length;
      return result;
    }

    for (const donation of candidates) {
      try {
        const projectId = donationPendingTaskProjectId(donation.id);

        const existingTask = await this.taskRepository.findOne({
          where: { project_id: projectId },
          select: ["id"],
        });
        if (existingTask) {
          result.skippedExisting += 1;
          continue;
        }

        const fresh = await this.donationRepository.findOne({
          where: { id: donation.id },
          relations: ["donor"],
        });
        if (!fresh || !isWebsiteDonationFollowUpStatus(fresh.status)) {
          result.skippedStatusChanged += 1;
          continue;
        }

        const task = await this.createFollowUpTask(fresh, agentIds);
        result.created += 1;
        result.taskIds.push(task.id);
        this.logger.log(
          `Created call-center follow-up task #${task.id} for donation #${donation.id}`,
        );
      } catch (error: any) {
        result.errors += 1;
        this.logger.error(
          `Failed follow-up task for donation #${donation.id}: ${error?.message}`,
        );
      }
    }

    return result;
  }

  private async getCallCenterAgentIds(): Promise<number[]> {
    const agents = await this.userRepository.find({
      where: {
        department: Department.FUND_RAISING,
        role: UserRole.CALL_CENTER_AGENT,
        isActive: true,
        is_archived: false,
      },
      select: ["id"],
      order: { first_name: "ASC", last_name: "ASC" },
    });
    return agents.map((a) => a.id);
  }

  private async createFollowUpTask(
    donation: Donation,
    agentIds: number[],
  ): Promise<Task> {
    const donor = donation.donor;
    const donorName =
      donor?.name?.trim() || `Donor #${donation.donor_id || "unknown"}`;
    const donorEmail = donor?.email?.trim() || "—";
    const donorPhone = donor?.phone?.trim() || "—";
    const amount =
      donation.amount != null
        ? `${donation.amount} ${donation.currency || "PKR"}`
        : "—";
    const method = donation.donation_method || "—";
    const status = String(donation.status || "pending").toLowerCase();
    const createdAt = donation.created_at
      ? new Date(donation.created_at).toLocaleString("en-PK", {
          timeZone: "Asia/Karachi",
        })
      : "—";

    const baseFrontendUrl = (process.env.BASE_Frontend_URL || "").replace(
      /\/$/,
      "",
    );
    const donationPath = `/donations/online_donations/view/${donation.id}`;
    const donationLink = baseFrontendUrl
      ? `${baseFrontendUrl}${donationPath}`
      : donationPath;

    const title = `${status === "failed" ? "Failed" : "Pending"} donation follow-up #${donation.id} — ${donorName}`;
    const description = [
      `A website donation has remained in ${status} status for more than ${PENDING_DONATION_FOLLOW_UP_MINUTES} minutes.`,
      "",
      `Donation ID: ${donation.id}`,
      `Donor: ${donorName}`,
      `Email: ${donorEmail}`,
      `Phone: ${donorPhone}`,
      `Amount: ${amount}`,
      `Method: ${method}`,
      `Status: ${status}`,
      `Created at (PKT): ${createdAt}`,
      "",
      `View donation: ${donationLink}`,
      "",
      "Please contact the donor to confirm payment or assist with checkout.",
      "Mark exactly one MOV item: Contacted Donor or Not Contacted Donor.",
    ].join("\n");

    const today = new Date();
    const dueDate = new Date(today);
    dueDate.setDate(dueDate.getDate() + 1);

    const dto: CreateTaskDto = {
      title,
      description,
      department: Department.FUND_RAISING,
      priority: TaskPriority.HIGH,
      workflow_type: TaskWorkflowType.STANDARD,
      task_type: TaskType.ONE_TIME,
      start_date: today.toISOString().slice(0, 10),
      due_date: dueDate.toISOString().slice(0, 10),
      project_id: donationPendingTaskProjectId(donation.id),
      project_name: `Donation #${donation.id}`,
      assigned_users: agentIds,
      mov_checklist: DONATION_PENDING_MOV_ITEMS.map((text) => ({
        text,
        checked: false,
        checked_by_id: 0,
        checked_at: new Date(0),
      })),
    };

    return this.tasksService.createSystemTask(dto);
  }
}
