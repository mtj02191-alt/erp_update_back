import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Brackets, Repository } from "typeorm";
import { User, UserRole } from "./user.entity";
import { UsersService } from "./users.service";
import { PermissionsService } from "../permissions/permissions.service";
import { Task, TaskStatus } from "../tasks/entities/task.entity";
import { Donor } from "../dms/donor/entities/donor.entity";
import { Donation } from "../donations/entities/donation.entity";
import { DonorFollowup } from "../dms/donor_relationship/entities/donor-followup.entity";
import { DonorInteraction } from "../dms/donor_relationship/entities/donor-interaction.entity";
import { DonationBox } from "../dms/donation_box/entities/donation-box.entity";
import { DonationBoxDonation } from "../dms/donation_box/donation_box_donation/entities/donation_box_donation.entity";

const COMPLETED_TASK_STATUSES = [
  TaskStatus.COMPLETED,
  TaskStatus.CLOSED,
  TaskStatus.APPROVED,
];

const TERMINAL_TASK_STATUSES = [
  ...COMPLETED_TASK_STATUSES,
  TaskStatus.CANCELLED,
];

type CurrentUser = Pick<User, "id" | "role" | "department">;

@Injectable()
export class UserPerformanceService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(Donor)
    private readonly donorRepository: Repository<Donor>,
    @InjectRepository(Donation)
    private readonly donationRepository: Repository<Donation>,
    @InjectRepository(DonorFollowup)
    private readonly followupRepository: Repository<DonorFollowup>,
    @InjectRepository(DonorInteraction)
    private readonly interactionRepository: Repository<DonorInteraction>,
    @InjectRepository(DonationBox)
    private readonly donationBoxRepository: Repository<DonationBox>,
    @InjectRepository(DonationBoxDonation)
    private readonly boxDonationRepository: Repository<DonationBoxDonation>,
    private readonly usersService: UsersService,
    private readonly permissionsService: PermissionsService,
  ) {}

  private async assertCanView(targetUserId: number, viewer?: CurrentUser) {
    if (!viewer?.id) {
      throw new ForbiddenException("Authentication required");
    }
    if (Number(viewer.id) === Number(targetUserId)) return;

    if (viewer.role === UserRole.SUPER_ADMIN || viewer.role === UserRole.ADMIN) {
      return;
    }

    const canList = await this.permissionsService.hasPermission(
      viewer.id,
      "users.list_view",
    );
    if (canList) return;

    const report = await this.userRepository.findOne({
      where: { id: targetUserId, manager_id: viewer.id },
      select: ["id"],
    });
    if (report) return;

    throw new ForbiddenException(
      "You can only view your own performance dashboard",
    );
  }

  private applyAssignedToUser(
    qb: ReturnType<Repository<Task>["createQueryBuilder"]>,
    userId: number,
  ) {
    qb.andWhere(
      new Brackets((sub) => {
        sub.where("task.assigned_user_ids @> ARRAY[:userId]::int[]", {
          userId,
        });
        sub.orWhere("task.assigned_users_meta @> :metaObj::jsonb", {
          metaObj: JSON.stringify([{ user_id: userId }]),
        });
      }),
    );
  }

  private getLastMonthRange() {
    const now = new Date();
    const startOfThisMonth = new Date(
      now.getFullYear(),
      now.getMonth(),
      1,
      0,
      0,
      0,
      0,
    );
    const startOfLastMonth = new Date(
      now.getFullYear(),
      now.getMonth() - 1,
      1,
      0,
      0,
      0,
      0,
    );

    return {
      startOfLastMonth,
      startOfThisMonth,
    };
  }

  private async getTaskPerformance(userId: number) {
    const baseQb = this.taskRepository.createQueryBuilder("task");
    this.applyAssignedToUser(baseQb, userId);

    const totalAssigned = await baseQb.clone().getCount();

    const completed = await baseQb
      .clone()
      .andWhere("task.status IN (:...statuses)", {
        statuses: COMPLETED_TASK_STATUSES,
      })
      .getCount();

    const pending = await baseQb
      .clone()
      .andWhere("task.status NOT IN (:...statuses)", {
        statuses: TERMINAL_TASK_STATUSES,
      })
      .getCount();

    const overdue = await baseQb
      .clone()
      .andWhere("task.due_date < CURRENT_DATE")
      .andWhere("task.status NOT IN (:...statuses)", {
        statuses: TERMINAL_TASK_STATUSES,
      })
      .getCount();

    const statusRows = await baseQb
      .clone()
      .select("task.status", "status")
      .addSelect("COUNT(task.id)", "count")
      .groupBy("task.status")
      .getRawMany();

    const priorityRows = await baseQb
      .clone()
      .select("task.priority", "priority")
      .addSelect("COUNT(task.id)", "count")
      .groupBy("task.priority")
      .getRawMany();

    const avgCompletion = await baseQb
      .clone()
      .select(
        "AVG(EXTRACT(EPOCH FROM (task.completed_date::timestamp - task.created_at::timestamp)) / 86400)",
        "avg_days",
      )
      .andWhere("task.completed_date IS NOT NULL")
      .andWhere("task.status IN (:...statuses)", {
        statuses: COMPLETED_TASK_STATUSES,
      })
      .getRawOne();

    const monthlyRows = await this.taskRepository
      .createQueryBuilder("task")
      .select("TO_CHAR(task.created_at, 'YYYY-MM')", "month")
      .addSelect(
        `SUM(CASE WHEN task.status IN ('${COMPLETED_TASK_STATUSES.join("','")}') THEN 1 ELSE 0 END)`,
        "completed",
      )
      .addSelect(
        `SUM(CASE WHEN task.status NOT IN ('${TERMINAL_TASK_STATUSES.join("','")}') THEN 1 ELSE 0 END)`,
        "pending",
      )
      .addSelect(
        `SUM(CASE WHEN task.due_date < CURRENT_DATE AND task.status NOT IN ('${TERMINAL_TASK_STATUSES.join("','")}') THEN 1 ELSE 0 END)`,
        "overdue",
      )
      .where(
        new Brackets((sub) => {
          sub.where("task.assigned_user_ids @> ARRAY[:userId]::int[]", {
            userId,
          });
          sub.orWhere("task.assigned_users_meta @> :metaObj::jsonb", {
            metaObj: JSON.stringify([{ user_id: userId }]),
          });
        }),
      )
      .andWhere("task.created_at >= :since", {
        since: new Date(new Date().setMonth(new Date().getMonth() - 5, 1)),
      })
      .groupBy("month")
      .orderBy("month", "ASC")
      .getRawMany();

    const completionRate =
      totalAssigned > 0 ? Math.round((completed / totalAssigned) * 100) : 0;

    const performanceScore = Math.max(
      0,
      Math.min(
        100,
        Math.round(
          completionRate * 0.65 +
            (totalAssigned > 0
              ? (1 - overdue / totalAssigned) * 35
              : 35),
        ),
      ),
    );

    return {
      total_assigned: totalAssigned,
      completed,
      pending,
      overdue,
      completion_rate: completionRate,
      performance_score: performanceScore,
      avg_completion_days: avgCompletion?.avg_days
        ? Number(Number(avgCompletion.avg_days).toFixed(1))
        : null,
      by_status: statusRows.reduce(
        (acc, row) => ({ ...acc, [row.status]: Number(row.count) }),
        {} as Record<string, number>,
      ),
      by_priority: priorityRows.reduce(
        (acc, row) => ({ ...acc, [row.priority]: Number(row.count) }),
        {} as Record<string, number>,
      ),
      monthly_trend: monthlyRows.map((row) => ({
        month: row.month,
        completed: Number(row.completed || 0),
        pending: Number(row.pending || 0),
        overdue: Number(row.overdue || 0),
      })),
    };
  }

  private async getDmsPerformance(userId: number, department?: string) {
    const isFundRaising =
      String(department || "").toLowerCase() === "fund_raising";

    if (!isFundRaising) {
      return {
        available: false,
        message: "DMS metrics are shown for Fund Raising users",
      };
    }

    const { startOfLastMonth, startOfThisMonth } = this.getLastMonthRange();

    const donorsAdded = await this.donorRepository
      .createQueryBuilder("donor")
      .where("donor.created_by = :userId", { userId })
      .andWhere("donor.is_archived = :archived", { archived: false })
      .getCount();

    const donorsAssigned = await this.donorRepository
      .createQueryBuilder("donor")
      .where("donor.assigned_to = :userId", { userId })
      .andWhere("donor.is_archived = :archived", { archived: false })
      .getCount();

    const donationsEntered = await this.donationRepository
      .createQueryBuilder("donation")
      .where("donation.created_by = :userId", { userId })
      .andWhere("donation.is_archived = :archived", { archived: false })
      .getCount();

    const donationsCompleted = await this.donationRepository
      .createQueryBuilder("donation")
      .where("donation.created_by = :userId", { userId })
      .andWhere("donation.is_archived = :archived", { archived: false })
      .andWhere("LOWER(donation.status) = :status", { status: "completed" })
      .getCount();

    const amountRow = await this.donationRepository
      .createQueryBuilder("donation")
      .select(
        "COALESCE(SUM(COALESCE(donation.paid_amount, donation.amount, 0)), 0)",
        "total",
      )
      .where("donation.created_by = :userId", { userId })
      .andWhere("donation.is_archived = :archived", { archived: false })
      .andWhere("LOWER(donation.status) = :status", { status: "completed" })
      .getRawOne();

    const pendingDonations = await this.donationRepository
      .createQueryBuilder("donation")
      .where("donation.created_by = :userId", { userId })
      .andWhere("donation.is_archived = :archived", { archived: false })
      .andWhere("LOWER(donation.status) IN (:...statuses)", {
        statuses: ["pending", "failed"],
      })
      .getCount();

    const donationBoxesManaged = await this.donationBoxRepository
      .createQueryBuilder("box")
      .innerJoin("box.assignedUsers", "user", "user.id = :userId", { userId })
      .andWhere("box.is_archived = :archived", { archived: false })
      .getCount();

    const donationBoxesAssignedLastMonth = await this.donationBoxRepository
      .createQueryBuilder("box")
      .innerJoin("box.assignedUsers", "user", "user.id = :userId", { userId })
      .andWhere("box.is_archived = :archived", { archived: false })
      .andWhere("box.created_at >= :startOfLastMonth", { startOfLastMonth })
      .andWhere("box.created_at < :startOfThisMonth", { startOfThisMonth })
      .getCount();

    const boxCollections = await this.boxDonationRepository
      .createQueryBuilder("collection")
      .where("collection.created_by = :userId", { userId })
      .andWhere("collection.is_archived = :archived", { archived: false })
      .getCount();

    const boxCollectionAmountRow = await this.boxDonationRepository
      .createQueryBuilder("collection")
      .select("COALESCE(SUM(collection.collection_amount), 0)", "total")
      .where("collection.created_by = :userId", { userId })
      .andWhere("collection.is_archived = :archived", { archived: false })
      .getRawOne();

    const lastMonthBoxCollectionAmountRow = await this.boxDonationRepository
      .createQueryBuilder("collection")
      .select("COALESCE(SUM(collection.collection_amount), 0)", "total")
      .where("collection.created_by = :userId", { userId })
      .andWhere("collection.is_archived = :archived", { archived: false })
      .andWhere("collection.collection_date >= :startOfLastMonth", {
        startOfLastMonth,
      })
      .andWhere("collection.collection_date < :startOfThisMonth", {
        startOfThisMonth,
      })
      .getRawOne();

    const donorsRegisteredLastMonth = await this.donorRepository
      .createQueryBuilder("donor")
      .where("donor.created_by = :userId", { userId })
      .andWhere("donor.is_archived = :archived", { archived: false })
      .andWhere("donor.created_at >= :startOfLastMonth", { startOfLastMonth })
      .andWhere("donor.created_at < :startOfThisMonth", { startOfThisMonth })
      .getCount();

    const donationsAddedLastMonth = await this.donationRepository
      .createQueryBuilder("donation")
      .where("donation.created_by = :userId", { userId })
      .andWhere("donation.is_archived = :archived", { archived: false })
      .andWhere("donation.created_at >= :startOfLastMonth", { startOfLastMonth })
      .andWhere("donation.created_at < :startOfThisMonth", { startOfThisMonth })
      .getCount();

    const donationBoxesRegistered = await this.donationBoxRepository
      .createQueryBuilder("box")
      .where("box.created_by = :userId", { userId })
      .andWhere("box.is_archived = :archived", { archived: false })
      .getCount();

    const donationBoxesRegisteredLastMonth = await this.donationBoxRepository
      .createQueryBuilder("box")
      .where("box.created_by = :userId", { userId })
      .andWhere("box.is_archived = :archived", { archived: false })
      .andWhere("box.created_at >= :startOfLastMonth", { startOfLastMonth })
      .andWhere("box.created_at < :startOfThisMonth", { startOfThisMonth })
      .getCount();

    const followupsCompleted = await this.followupRepository.count({
      where: { completed_by_user_id: userId, status: "completed" },
    });

    const pendingFollowups = await this.followupRepository
      .createQueryBuilder("f")
      .where("f.assigned_to_user_id = :userId", { userId })
      .andWhere("f.status IN (:...statuses)", {
        statuses: ["pending", "rescheduled"],
      })
      .andWhere("f.is_archived = :archived", { archived: false })
      .getCount();

    const totalFollowups = await this.followupRepository
      .createQueryBuilder("f")
      .where("f.assigned_to_user_id = :userId", { userId })
      .andWhere("f.is_archived = :archived", { archived: false })
      .getCount();

    const overdueFollowups = await this.followupRepository
      .createQueryBuilder("f")
      .where("f.assigned_to_user_id = :userId", { userId })
      .andWhere("f.is_archived = :archived", { archived: false })
      .andWhere("f.status IN (:...statuses)", {
        statuses: ["pending", "rescheduled", "need_followup"],
      })
      .andWhere("f.due_datetime < NOW()")
      .getCount();

    const lastMonthFollowups = await this.followupRepository
      .createQueryBuilder("f")
      .where("f.assigned_to_user_id = :userId", { userId })
      .andWhere("f.is_archived = :archived", { archived: false })
      .andWhere("f.created_at >= :startOfLastMonth", { startOfLastMonth })
      .andWhere("f.created_at < :startOfThisMonth", { startOfThisMonth })
      .getCount();

    const lastMonthCompletedFollowups = await this.followupRepository
      .createQueryBuilder("f")
      .where("f.completed_by_user_id = :userId", { userId })
      .andWhere("f.is_archived = :archived", { archived: false })
      .andWhere("f.status = :status", { status: "completed" })
      .andWhere("f.completed_at >= :startOfLastMonth", { startOfLastMonth })
      .andWhere("f.completed_at < :startOfThisMonth", { startOfThisMonth })
      .getCount();

    const lastMonthOverdueFollowups = await this.followupRepository
      .createQueryBuilder("f")
      .where("f.assigned_to_user_id = :userId", { userId })
      .andWhere("f.is_archived = :archived", { archived: false })
      .andWhere("f.status IN (:...statuses)", {
        statuses: ["pending", "rescheduled", "need_followup"],
      })
      .andWhere("f.due_datetime >= :startOfLastMonth", { startOfLastMonth })
      .andWhere("f.due_datetime < :startOfThisMonth", { startOfThisMonth })
      .getCount();

    const interactionsLogged = await this.interactionRepository
      .createQueryBuilder("i")
      .where("i.created_by = :userId", { userId })
      .andWhere("i.is_archived = :archived", { archived: false })
      .getCount();

    const uniqueInteractionDonorsRow = await this.interactionRepository
      .createQueryBuilder("i")
      .select("COUNT(DISTINCT i.donor_id)", "count")
      .where("i.created_by = :userId", { userId })
      .andWhere("i.is_archived = :archived", { archived: false })
      .getRawOne();

    const lastMonthInteractionsLogged = await this.interactionRepository
      .createQueryBuilder("i")
      .where("i.created_by = :userId", { userId })
      .andWhere("i.is_archived = :archived", { archived: false })
      .andWhere("i.activity_datetime >= :startOfLastMonth", { startOfLastMonth })
      .andWhere("i.activity_datetime < :startOfThisMonth", { startOfThisMonth })
      .getCount();

    const lastMonthUniqueInteractionDonorsRow = await this.interactionRepository
      .createQueryBuilder("i")
      .select("COUNT(DISTINCT i.donor_id)", "count")
      .where("i.created_by = :userId", { userId })
      .andWhere("i.is_archived = :archived", { archived: false })
      .andWhere("i.activity_datetime >= :startOfLastMonth", { startOfLastMonth })
      .andWhere("i.activity_datetime < :startOfThisMonth", { startOfThisMonth })
      .getRawOne();

    return {
      available: true,
      donors_added: donorsAdded,
      donors_assigned: donorsAssigned,
      donations_entered: donationsEntered,
      donations_completed: donationsCompleted,
      donations_pending_recovery: pendingDonations,
      donation_amount_handled: Number(amountRow?.total || 0),
      donation_boxes_managed: donationBoxesManaged,
      box_collections_submitted: boxCollections,
      followups_completed: followupsCompleted,
      pending_followups: pendingFollowups,
      donor_interactions_logged: interactionsLogged,
      approved_donation_allotments: 0,
      pending_allotment_approvals: 0,
      period_summary: {
        total: {
          donation_boxes_assigned: donationBoxesManaged,
          donations_box_collection: Number(boxCollectionAmountRow?.total || 0),
          donations_added: donationsEntered,
          donor_registered: donorsAdded,
          donation_boxes_registered: donationBoxesRegistered,
          followups: totalFollowups,
          followups_completed: followupsCompleted,
          followups_overdue: overdueFollowups,
          interactions: interactionsLogged,
          interaction_donors: Number(uniqueInteractionDonorsRow?.count || 0),
        },
        last_month: {
          donation_boxes_assigned: donationBoxesAssignedLastMonth,
          donations_box_collection: Number(
            lastMonthBoxCollectionAmountRow?.total || 0,
          ),
          donations_added: donationsAddedLastMonth,
          donor_registered: donorsRegisteredLastMonth,
          donation_boxes_registered: donationBoxesRegisteredLastMonth,
          followups: lastMonthFollowups,
          followups_completed: lastMonthCompletedFollowups,
          followups_overdue: lastMonthOverdueFollowups,
          interactions: lastMonthInteractionsLogged,
          interaction_donors: Number(
            lastMonthUniqueInteractionDonorsRow?.count || 0,
          ),
        },
      },
    };
  }

  async getPerformanceDashboard(targetUserId: number, viewer?: CurrentUser) {
    await this.assertCanView(targetUserId, viewer);

    const profile = await this.usersService.findOneForView(targetUserId);
    if (!profile) {
      throw new NotFoundException("User not found");
    }

    const [tasks, dms] = await Promise.all([
      this.getTaskPerformance(targetUserId),
      this.getDmsPerformance(targetUserId, profile.department),
    ]);

    const locationLabel =
      profile.geographic_assignments?.length > 0
        ? profile.geographic_assignments
            .slice(0, 3)
            .map((g: { name?: string }) => g.name)
            .filter(Boolean)
            .join(", ")
        : [profile.address].filter(Boolean).join(", ") || null;

    return {
      profile: {
        id: profile.id,
        name:
          [profile.first_name, profile.last_name].filter(Boolean).join(" ").trim() ||
          profile.email,
        email: profile.email,
        user_code: (profile as any).user_code ?? null,
        role: profile.role,
        department: profile.department,
        branch_location: locationLabel,
        manager: profile.manager,
        is_active: profile.isActive,
        joining_date: profile.joining_date,
        geographic_assignments: profile.geographic_assignments,
      },
      overview: {
        completed_tasks: tasks.completed,
        pending_tasks: tasks.pending,
        overdue_tasks: tasks.overdue,
        total_assigned_tasks: tasks.total_assigned,
        donations_processed: dms.available ? dms.donations_completed : 0,
        donor_followups: dms.available ? dms.followups_completed : 0,
        performance_score: tasks.performance_score,
      },
      tasks,
      dms,
    };
  }
}
