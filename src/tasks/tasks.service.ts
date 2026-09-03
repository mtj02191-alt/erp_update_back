import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, SelectQueryBuilder, IsNull, Not, Brackets, In } from "typeorm";
import {
  Task,
  TaskStatus,
  TaskWorkflowType,
  TaskType,
  RecurrenceEndType,
} from "./entities/task.entity";
import {
  TaskNotification,
  TaskNotificationType,
} from "./entities/task-notification.entity";
import { TaskAttachment } from "./entities/task-attachment.entity";
import { TaskComment } from "./entities/task-comment.entity";
import { TaskActivity } from "./entities/task-activity.entity";
import { TaskTimeEntry } from "./entities/task-time-entry.entity";
import { CreateTaskDto } from "./dto/create-task.dto";
import { UpdateTaskDto } from "./dto/update-task.dto";
import { AssignTaskDto } from "./dto/assign-task.dto";
import { ApproveTaskDto } from "./dto/approve-task.dto";
import { AddAttachmentDto } from "./dto/add-attachment.dto";
import { AddCommentDto } from "./dto/add-comment.dto";
import { StatusTransitionDto } from "./dto/status-transition.dto";
import { User, UserRole, Department } from "../users/user.entity";
import { EmailService } from "../email/email.service";
import { applyCommonFilters } from "../utils/filters/common-filter.util";
import { PermissionsService } from "../permissions/permissions.service";
import { DataScopeService } from "../permissions/data-scope/data-scope.service";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationType } from "../notifications/entities/notification.entity";
import * as fs from "fs";
import * as path from "path";
import { TaskApproval } from "./entities/task-approval.entity";
import { TaskDueReminder } from "./entities/task-due-reminder.entity";
import { CreateTaskDueReminderDto } from "./dto/create-task-due-reminder.dto";
import {
  computeRemindOnDate,
  dueDateToPktDateString,
  formatDateOnlyPkt,
  getPktHour,
  isReminderSlotInPast,
} from "./utils/task-reminder-pkt.util";

@Injectable()
export class TasksService {
  private readonly logger = new Logger(TasksService.name);
  private readonly searchableColumns = ["title", "description", "project_name"];

  constructor(
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
    @InjectRepository(TaskAttachment)
    private readonly attachmentRepo: Repository<TaskAttachment>,
    @InjectRepository(TaskComment)
    private readonly commentRepo: Repository<TaskComment>,
    @InjectRepository(TaskActivity)
    private readonly activityRepo: Repository<TaskActivity>,
    @InjectRepository(TaskNotification)
    private readonly notificationRepo: Repository<TaskNotification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(TaskTimeEntry)
    private readonly timeEntryRepo: Repository<TaskTimeEntry>,
    @InjectRepository(TaskApproval)
    private readonly taskApprovalRepo: Repository<TaskApproval>,
    @InjectRepository(TaskDueReminder)
    private readonly dueReminderRepo: Repository<TaskDueReminder>,
    private readonly emailService: EmailService,
    private readonly permissionsService: PermissionsService,
    private readonly dataScopeService: DataScopeService,
    private readonly notificationsService: NotificationsService,
  ) {}

  private normalizeUserIds(ids?: number[] | null): number[] {
    return [
      ...new Set(
        (ids || [])
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    ];
  }

  private getNewlyAssignedUserIds(
    previousIds?: number[] | null,
    nextIds?: number[] | null,
  ): number[] {
    const previous = new Set(this.normalizeUserIds(previousIds));
    return this.normalizeUserIds(nextIds).filter((id) => !previous.has(id));
  }

  private async sendTaskAppNotification(params: {
    task: Task;
    userIds: number[];
    title: string;
    message: string;
    event: string;
    actor?: User | null;
    excludeUserIds?: number[];
    extraMetadata?: Record<string, any>;
  }): Promise<void> {
    const exclude = new Set(
      this.normalizeUserIds(params.excludeUserIds).concat(
        params.actor?.id ? [Number(params.actor.id)] : [],
      ),
    );
    const recipients = this.normalizeUserIds(params.userIds).filter(
      (id) => !exclude.has(id),
    );
    if (!recipients.length) return;

    try {
      await this.notificationsService.create(
        {
          title: params.title,
          message: params.message,
          type: NotificationType.TASK,
          link: `/tasks/view/${params.task.id}`,
          metadata: {
            task_id: params.task.id,
            title: params.task.title,
            event: params.event,
            actor_id: params.actor?.id ?? null,
            ...(params.extraMetadata || {}),
          },
        },
        recipients,
        params.actor || undefined,
      );
    } catch (err: any) {
      this.logger.warn(
        `Failed to send task notification (${params.event}): ${err?.message}`,
      );
    }
  }

  private getTaskStakeholderIds(task: Task): number[] {
    return this.normalizeUserIds([
      ...(Array.isArray(task.assigned_user_ids) ? task.assigned_user_ids : []),
      task.created_by_id != null ? Number(task.created_by_id) : 0,
    ]);
  }

  private async sendAssignmentNotifications(
    task: Task,
    userIds: number[],
    actor?: User | null,
  ): Promise<void> {
    const assignerName = this.userDisplayName(actor);
    await this.sendTaskAppNotification({
      task,
      userIds,
      actor,
      event: "assignment",
      title: "New Task Assigned",
      message: assignerName
        ? `${assignerName} assigned you to task: ${task.title}`
        : `You have been assigned to task: ${task.title}`,
      extraMetadata: { assigned_by_id: actor?.id ?? null },
    });
  }

  private async sendApproverNotifications(
    task: Task,
    userIds: number[],
    actor?: User | null,
  ): Promise<void> {
    const actorName = this.userDisplayName(actor);
    await this.sendTaskAppNotification({
      task,
      userIds,
      actor,
      event: "approver",
      title: "Task Approval Required",
      message: actorName
        ? `${actorName} added you as an approver on task: ${task.title}`
        : `You were added as an approver on task: ${task.title}`,
    });
  }

  private async sendStatusUpdateNotifications(
    task: Task,
    oldStatus: string,
    newStatus: string,
    actor?: User | null,
  ): Promise<void> {
    if (!oldStatus || !newStatus || oldStatus === newStatus) return;

    const actorName = this.userDisplayName(actor) || "Someone";
    const stakeholderIds = this.getTaskStakeholderIds(task);

    await this.sendTaskAppNotification({
      task,
      userIds: stakeholderIds,
      actor,
      event: "status",
      title: "Task Status Updated",
      message: `${actorName} changed status of "${task.title}" from ${oldStatus} to ${newStatus}`,
      extraMetadata: { from_status: oldStatus, to_status: newStatus },
    });

    // When submitted for approval, also notify configured approvers
    if (newStatus === TaskStatus.PENDING_APPROVAL) {
      await this.sendTaskAppNotification({
        task,
        userIds: task.approval_required_user_ids || [],
        actor,
        event: "status_pending_approval",
        title: "Task Pending Your Approval",
        message: `"${task.title}" is pending your approval`,
        extraMetadata: { from_status: oldStatus, to_status: newStatus },
        excludeUserIds: stakeholderIds, // already notified above if also stakeholder
      });
    }
  }

  private async sendCommentNotifications(
    task: Task,
    commentContent: string,
    mentionedUserIds: number[],
    author: User,
  ): Promise<void> {
    const authorName = this.userDisplayName(author) || "A colleague";
    const preview = (commentContent || "").trim().slice(0, 120);

    if (mentionedUserIds.length > 0) {
      await this.sendTaskAppNotification({
        task,
        userIds: mentionedUserIds,
        actor: author,
        event: "mention",
        title: "Mentioned in Task Comment",
        message: `${authorName} mentioned you on "${task.title}"${preview ? `: ${preview}` : ""}`,
      });
    }

    const mentionedSet = new Set(this.normalizeUserIds(mentionedUserIds));
    const stakeholderIds = this.getTaskStakeholderIds(task).filter(
      (id) => !mentionedSet.has(id),
    );

    await this.sendTaskAppNotification({
      task,
      userIds: stakeholderIds,
      actor: author,
      event: "comment",
      title: "New Comment on Task",
      message: `${authorName} commented on "${task.title}"${preview ? `: ${preview}` : ""}`,
    });
  }

  async sendAssignmentEmailsToAssignees(
    task: Task,
    master?: Task,
  ): Promise<void> {
    try {
      if (
        !Array.isArray(task.assigned_user_ids) ||
        task.assigned_user_ids.length === 0
      ) {
        return;
      }

      for (const userId of task.assigned_user_ids) {
        try {
          const user = await this.userRepo.findOne({
            where: { id: userId },
          });
          if (user && user.email) {
            await this.emailService.sendTaskAssignmentEmail(user, task, master);
          }
        } catch (emailErr: any) {
          this.logger.warn(
            `Failed to send assignment email to user ${userId}: ${emailErr?.message}`,
          );
        }
      }
    } catch (err: any) {
      this.logger.error(
        `Error in sendAssignmentEmailsToAssignees: ${err?.message}`,
      );
    }
  }

  private userDisplayName(u?: User | null): string | null {
    if (!u) return null;
    const full = `${u.first_name || ""} ${u.last_name || ""}`.trim() || null;
    return full || u.email || null;
  }

  private assertTaskMutationAllowed(
    task: Task,
    currentUser: User,
    operation: "update" | "delete",
    perms?: { canUpdate?: boolean; canDelete?: boolean },
  ): void {
    const userId = Number(currentUser.id);
    const role = String(currentUser.role || "").toLowerCase();
    const isAdminRole =
      role === UserRole.SUPER_ADMIN.toLowerCase() ||
      role === UserRole.ADMIN.toLowerCase();
    const isCreator =
      task.created_by_id != null && Number(task.created_by_id) === userId;
    const assignedIds = Array.isArray(task.assigned_user_ids)
      ? task.assigned_user_ids.map((v) => Number(v)).filter((v) => !isNaN(v))
      : [];
    const metaIds = Array.isArray(task.assigned_users_meta)
      ? task.assigned_users_meta
          .map((meta: any) => (meta && meta.user_id != null ? Number(meta.user_id) : null))
          .filter((v) => v !== null && !isNaN(v))
      : [];
    const isAssignee = [...assignedIds, ...metaIds].includes(userId);

    if (isAdminRole || isCreator) {
      return;
    }


    const requiredPermission =
      operation === "delete" ? perms?.canDelete : perms?.canUpdate;
    if (!requiredPermission) {
      throw new ForbiddenException(
        `Insufficient permissions to ${operation} this task.`,
      );
    }
  }

  private async getTaskScope(
    user: User,
  ): Promise<"org" | "department" | "team" | "self"> {
    const permissions = await this.permissionsService.getUserPermissions(
      Number(user.id),
    );
    const deptKey =
      user.department &&
      permissions?.[user.department] &&
      permissions[user.department]?.tasks
        ? user.department
        : null;
    const modulePermissions =
      (deptKey ? permissions?.[deptKey]?.tasks : null) ||
      permissions?.admin?.tasks ||
      permissions?.tasking?.tasks ||
      permissions?.tasks ||
      {};
    const reports = modulePermissions?.reports || {};
    if (reports.view_all === true) return "org";
    if (reports.view_dept === true) return "department";
    if (reports.view_team === true) return "team";
    if (reports.view_own === true) return "self";

    // Fallback based on role if no explicit scope is defined in reports
    if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN) {
      return "org";
    }
    if (
      (user.role === UserRole.MANAGER || user.role === UserRole.DEPT_HEAD) &&
      user.department
    ) {
      return "department";
    }
    if (user.role === UserRole.TEAM_LEAD) {
      return "team";
    }

    return "self";
  }

  private async getTaskPermissionsForUser(user: User): Promise<{
    canView: boolean;
    canCreate: boolean;
    canUpdate: boolean;
    canDelete: boolean;
    canAssign: boolean;
    canApprove: boolean;
    canComplete: boolean;
    canEditCompleted: boolean;
    reportScope: "org" | "department" | "team" | "self";
  }> {
    const permissions = await this.permissionsService.getUserPermissions(
      Number(user.id),
    );
    const deptKey =
      user.department && permissions?.[user.department]?.tasks
        ? user.department
        : null;
    const modulePermissions =
      (deptKey ? permissions?.[deptKey]?.tasks : null) ||
      permissions?.admin?.tasks ||
      permissions?.tasking?.tasks ||
      permissions?.tasks ||
      {};
    const reports = modulePermissions?.reports || {};
    const actions =
      reports && Object.keys(reports).length > 0 ? reports : modulePermissions;
    let scope: "org" | "department" | "team" | "self" = "self";
    if (reports.view_all === true) {
      scope = "org";
    } else if (reports.view_dept === true) {
      scope = "department";
    } else if (reports.view_team === true) {
      scope = "team";
    } else if (reports.view_own === true) {
      scope = "self";
    } else {
      // Fallback based on role if no explicit scope is defined in reports
      if (user.role === UserRole.SUPER_ADMIN || user.role === UserRole.ADMIN) {
        scope = "org";
      } else if (
        (user.role === UserRole.MANAGER || user.role === UserRole.DEPT_HEAD) &&
        user.department
      ) {
        scope = "department";
      } else if (user.role === UserRole.TEAM_LEAD) {
        scope = "team";
      }
    }
    const canViewBase = actions.view === true;
    const canViewReports =
      reports.view_all === true ||
      reports.view_dept === true ||
      reports.view_team === true ||
      reports.view_own === true;
    const canUpdate =
      actions.update === true || permissions?.super_admin === true;
    const canEditCompleted =
      actions.edit_completed === true ||
      actions.update === true ||
      permissions?.super_admin === true;
    return {
      canView:
        canViewBase || canViewReports || permissions?.super_admin === true,
      canCreate: actions.create === true || permissions?.super_admin === true,
      canUpdate,
      canDelete: actions.delete === true || permissions?.super_admin === true,
      canAssign: actions.assign === true || permissions?.super_admin === true,
      canApprove: actions.approve === true || permissions?.super_admin === true,
      canComplete:
        actions.complete === true || permissions?.super_admin === true,
      canEditCompleted,
      reportScope: scope,
    };
  }

  private async upsertTaskApprovalState(task: Task): Promise<void> {
    if (!task || !task.id) {
      return;
    }
    const approvalStatusCandidates: TaskStatus[] = [
      TaskStatus.PENDING_APPROVAL,
      TaskStatus.APPROVED,
      TaskStatus.REJECTED,
    ];
    const existing = await this.taskApprovalRepo.findOne({
      where: { task_id: task.id },
    });
    let approvalStatus = existing?.approval_status ?? null;
    if (approvalStatusCandidates.includes(task.status)) {
      approvalStatus = task.status;
    } else if (task.status === TaskStatus.CLOSED) {
      approvalStatus = existing?.approval_status ?? null;
    } else {
      approvalStatus = null;
    }
    const record =
      existing ??
      this.taskApprovalRepo.create({
        task_id: task.id,
      });
    record.approval_required_user_ids =
      task.approval_required_user_ids ??
      record.approval_required_user_ids ??
      null;
    record.approved_by_id =
      task.approved_by_id ?? record.approved_by_id ?? null;
    record.rejected_by_id =
      task.rejected_by_id ?? record.rejected_by_id ?? null;
    record.approval_status = approvalStatus;
    await this.taskApprovalRepo.save(record);
  }

  private async setTaskApprovalMeta(
    taskId: number,
    meta:
      | {
          user_id: number;
          decision: "approved" | "rejected" | "pending";
          decided_at?: Date;
        }[]
      | null,
  ): Promise<void> {
    if (!taskId) return;
    const existing = await this.taskApprovalRepo.findOne({
      where: { task_id: taskId },
    });
    const record =
      existing ??
      this.taskApprovalRepo.create({
        task_id: taskId,
      });
    record.approvals_meta = meta;
    await this.taskApprovalRepo.save(record);
  }

  private async applyRoleFilters(
    qb: SelectQueryBuilder<Task>,
    user?: User,
  ): Promise<void> {
    if (!user) return;

    qb.andWhere(
      new Brackets((mainQb) => {
        this.applyRoleFiltersWithoutBrackets(mainQb, user);
      }),
    );
  }

  private applyRoleFiltersWithoutBrackets(
    qb: any, // Using any for flexibility since it's a query builder sub-query
    user?: User,
  ): void {
    if (!user) return;

    // A. Super Admin & Admin: Always see all tasks
    const roleStr = String(user.role).toLowerCase();
    if (roleStr === UserRole.SUPER_ADMIN || roleStr === UserRole.ADMIN) {
      qb.where("1=1");
      return;
    }

    // B. Required Approver: See tasks they need to approve (even across departments)
    qb.where(
      "task.approval_required_user_ids @> ARRAY[:userId]::int[]",
      {
        userId: user.id,
      },
    );

    // C. Direct Involvement: See tasks where user is assigned, creator, or reporter (regardless of department)
    qb.orWhere("task.assigned_user_ids @> ARRAY[:userId]::int[]", {
      userId: user.id,
    });
    qb.orWhere("task.created_by_id = :userId", { userId: user.id });
    qb.orWhere("task.reported_by_id = :userId", { userId: user.id });

    // D. Role-based Department Visibility: Leaders see all tasks within their department
    const leadershipRoles = [
      UserRole.DEPT_HEAD,
      UserRole.MANAGER,
      UserRole.ASSISTANT_MANAGER,
      UserRole.TEAM_LEAD,
      UserRole.COORDINATOR,
      UserRole.SYSTEM_ADMIN,
    ];

    if (
      user.department &&
      roleStr &&
      leadershipRoles.map((r) => r.toLowerCase()).includes(roleStr)
    ) {
      qb.orWhere("task.department = :userDept", {
        userDept: user.department.toLowerCase(),
      });

      // E. Cross-department visibility for Managers:
      // If a task is assigned to a user who belongs to the manager's department,
      // the manager should see it even if the task's primary department is different.
      qb.orWhere("task.assigned_users_meta @> :deptMeta::jsonb", {
        deptMeta: JSON.stringify([
          { department: String(user.department).toLowerCase() },
        ]),
      });
    }
  }

  /**
   * Assigned-to-team = tasks assigned to people in my reporting tree
   * (managers / user_managers), not everyone in my department.
   */
  private async applyAssignedToTeamFilter(
    qb: SelectQueryBuilder<Task>,
    currentUser: User,
    paramSuffix = "",
  ): Promise<void> {
    await this.dataScopeService.applyReportingTeamFilter(qb, currentUser.id, {
      intArrayColumn: "task.assigned_user_ids",
      jsonbUserIdsColumn: "task.assigned_users_meta",
      paramKey: `taskTeam${paramSuffix}`,
    });
  }

  private async applyViewTypeFilter(
    qb: SelectQueryBuilder<Task>,
    viewType: string | undefined,
    currentUser?: User,
  ): Promise<void> {
    if (!viewType || !currentUser) return;

    if (viewType === "created") {
      qb.andWhere("task.created_by_id = :currentUserId", {
        currentUserId: currentUser.id,
      });
      return;
    }

    if (viewType === "assigned") {
      qb.andWhere(
        new Brackets((dqb) => {
          dqb.where(
            "task.assigned_user_ids @> ARRAY[:currentUserId]::int[]",
            { currentUserId: currentUser.id },
          );
          dqb.orWhere("task.assigned_users_meta @> :metaObj::jsonb", {
            metaObj: JSON.stringify([{ user_id: currentUser.id }]),
          });
        }),
      );
      return;
    }

    if (viewType === "assigned_to_team") {
      await this.applyAssignedToTeamFilter(qb, currentUser, "View");
      return;
    }

    if (viewType === "approval_tasks") {
      qb.andWhere(
        "task.approval_required_user_ids @> ARRAY[:currentUserId]::int[]",
        { currentUserId: currentUser.id },
      );
      return;
    }

    if (viewType === "other_tasks") {
      qb.andWhere("task.created_by_id = :currentUserId", {
        currentUserId: currentUser.id,
      });
    }
  }

  /**
   * Department filter: load users of that department, then match tasks where
   * creator OR any assignee is among those user ids.
   */
  private async applyDepartmentUsersFilter(
    qb: SelectQueryBuilder<Task>,
    department: string | undefined,
    paramSuffix = "",
  ): Promise<void> {
    if (!department || String(department).trim() === "") return;

    const lowerDept = String(department).trim().toLowerCase();
    const rows = await this.userRepo
      .createQueryBuilder("u")
      .select("u.id", "id")
      .where("u.department = :dept", { dept: lowerDept })
      .andWhere("(u.isActive = true OR u.isActive IS NULL)")
      .andWhere("(u.is_archived = false OR u.is_archived IS NULL)")
      .getRawMany();

    const deptUserIds = rows
      .map((r) => Number(r.id))
      .filter((id) => Number.isInteger(id) && id > 0);

    if (deptUserIds.length === 0) {
      qb.andWhere("1=0");
      return;
    }

    const idsKey = `deptUserIds${paramSuffix}`;
    const arrKey = `deptUserIdsArr${paramSuffix}`;

    qb.andWhere(
      new Brackets((dqb) => {
        dqb.where(`task.created_by_id IN (:...${idsKey})`, {
          [idsKey]: deptUserIds,
        });
        dqb.orWhere(`task.assigned_user_ids && :${arrKey}::int[]`, {
          [arrKey]: deptUserIds,
        });
        dqb.orWhere(
          `EXISTS (
            SELECT 1
            FROM jsonb_array_elements(COALESCE(task.assigned_users_meta, '[]'::jsonb)) AS assignee
            WHERE (assignee->>'user_id')::int IN (:...${idsKey})
          )`,
          { [idsKey]: deptUserIds },
        );
      }),
    );
  }

  private async getAssignedUsersMeta(
    userIds?: number[],
  ): Promise<
    { user_id: number; department: Department; name: string }[] | null
  > {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return null;
    }
    const numericIds = userIds
      .map((id) => Number(id))
      .filter((id) => !isNaN(id));
    if (numericIds.length === 0) {
      return null;
    }
    const users = await this.userRepo
      .createQueryBuilder("user")
      .where("user.id IN (:...ids)", { ids: numericIds })
      .getMany();
    return users.map((u) => ({
      user_id: u.id,
      department: u.department,
      name:
        `${u.first_name || ""} ${u.last_name || ""}`.trim() ||
        u.email ||
        `User #${u.id}`,
    }));
  }

  /** System/cron task creation — no permission checks; created_by is null. */
  async createSystemTask(dto: CreateTaskDto): Promise<Task> {
    return this.createInternal(dto, null);
  }

  async create(dto: CreateTaskDto, currentUser: User): Promise<Task> {
    return this.createInternal(dto, currentUser);
  }

  private async createInternal(
    dto: CreateTaskDto,
    currentUser: User | null,
  ): Promise<Task> {
    try {
      const assignedUsersMeta = await this.getAssignedUsersMeta(
        dto.assigned_users,
      );
      const assignedUserIds = new Set(
        (dto.assigned_users || []).map((id) => Number(id)),
      );
      const movAssignments = Array.isArray(dto.mov_assignments)
        ? dto.mov_assignments.filter(
            (item) =>
              Number.isInteger(Number(item.mov_index)) &&
              (item.user_id == null || assignedUserIds.has(Number(item.user_id))),
          )
        : [];

      // Handle MOV checklist - store only in mov_items, not in description
      let movItemsFromDto: string[] = [];
      if (dto.mov_checklist && dto.mov_checklist.length > 0) {
        movItemsFromDto = dto.mov_checklist.map((item) => item.text);
      }

      const task = this.taskRepo.create({
        title: dto.title,
        description: dto.description || "",
        department: dto.department,
        priority: dto.priority,
        workflow_type: dto.workflow_type || TaskWorkflowType.STANDARD,
        task_type: dto.task_type || TaskType.ONE_TIME,
        start_date: dto.start_date ? new Date(dto.start_date) : null,
        due_date: dto.due_date ? new Date(dto.due_date) : null,
        project_id: dto.project_id || null,
        project_name: dto.project_name || null,
        recurrence_rule: dto.recurrence_rule || null,
        recurrence_next_date:
          dto.task_type === TaskType.RECURRING &&
          dto.start_date &&
          dto.recurrence_rule
            ? this.getNextOccurrence(
                new Date(dto.start_date),
                dto.recurrence_rule,
              )
            : dto.recurrence_next_date
              ? new Date(dto.recurrence_next_date)
              : null,
        recurrence_end_type: dto.recurrence_end_type || RecurrenceEndType.NEVER,
        recurrence_end_date: dto.recurrence_end_date
          ? new Date(dto.recurrence_end_date)
          : null,
        recurrence_end_occurrences: dto.recurrence_end_occurrences || null,
        reported_by_id:
          typeof dto.reported_by_id === "number" ? dto.reported_by_id : null,
        created_by_id: currentUser?.id ?? null,
        assigned_user_ids: Array.isArray(dto.assigned_users)
          ? dto.assigned_users
          : null,
        assigned_users_meta: assignedUsersMeta,
        mov_assignments: movAssignments,
        approval_required_user_ids: Array.isArray(
          dto.approval_required_user_ids,
        )
          ? dto.approval_required_user_ids
          : null,
        mov_items: movItemsFromDto.length > 0 ? movItemsFromDto : null,
      });

      const saved = await this.taskRepo.save(task);
      await this.logActivity(saved, currentUser, "created", {
        title: saved.title,
      });

      await this.sendAssignmentEmailsToAssignees(saved);
      await this.sendAssignmentNotifications(
        saved,
        saved.assigned_user_ids || [],
        currentUser,
      );
      await this.sendApproverNotifications(
        saved,
        saved.approval_required_user_ids || [],
        currentUser,
      );

      return saved;
    } catch (e) {
      throw e;
    }
  }

  public getNextOccurrence(date: Date, rule: string): Date {
    const next = new Date(date);
    const ruleLower = (rule || "").toLowerCase();

    if (ruleLower === "daily") {
      next.setDate(next.getDate() + 1);
    } else if (ruleLower === "weekly") {
      next.setDate(next.getDate() + 7);
    } else if (ruleLower === "monthly") {
      next.setMonth(next.getMonth() + 1);
    } else if (ruleLower === "quarterly") {
      next.setMonth(next.getMonth() + 3);
    } else if (ruleLower === "annually") {
      next.setFullYear(next.getFullYear() + 1);
    } else if (ruleLower.includes("days")) {
      const days = parseInt(ruleLower.split(" ")[0]);
      if (!isNaN(days)) {
        next.setDate(next.getDate() + days);
      }
    } else {
      // Default to daily if rule is unknown
      next.setDate(next.getDate() + 1);
    }
    return next;
  }

  public calculateRecurrenceInfo(task: Task) {
    if (task.task_type !== TaskType.RECURRING || !task.recurrence_rule) {
      return null;
    }

    const upcomingDates: Date[] = [];
    let lastDate: Date | null = null;
    let remainingCount: number | null = null;

    const current = task.recurrence_next_date
      ? new Date(task.recurrence_next_date)
      : new Date();

    if (task.recurrence_end_type === RecurrenceEndType.AFTER_OCCURRENCES) {
      remainingCount = Math.max(
        0,
        (task.recurrence_end_occurrences || 0) - task.recurrence_created_count,
      );

      let tempCurrent = new Date(current);
      for (let i = 0; i < remainingCount; i++) {
        if (i < 5) upcomingDates.push(new Date(tempCurrent));
        lastDate = new Date(tempCurrent);
        tempCurrent = this.getNextOccurrence(tempCurrent, task.recurrence_rule);
      }
    } else if (task.recurrence_end_type === RecurrenceEndType.ON_DATE) {
      const endDate = task.recurrence_end_date
        ? new Date(task.recurrence_end_date)
        : null;
      if (endDate) {
        let tempCurrent = new Date(current);
        let count = 0;
        while (tempCurrent <= endDate) {
          if (count < 5) upcomingDates.push(new Date(tempCurrent));
          lastDate = new Date(tempCurrent);
          tempCurrent = this.getNextOccurrence(
            tempCurrent,
            task.recurrence_rule,
          );
          count++;
        }
        remainingCount = count;
      }
    } else {
      // NEVER
      let tempCurrent = new Date(current);
      for (let i = 0; i < 5; i++) {
        upcomingDates.push(new Date(tempCurrent));
        tempCurrent = this.getNextOccurrence(tempCurrent, task.recurrence_rule);
      }
      remainingCount = null; // Indefinite
      lastDate = null;
    }

    return {
      upcomingDates,
      lastDate,
      remainingCount,
    };
  }

  async findAll(payload: any, currentUser?: User) {
    try {
      const page = +(payload?.pagination?.page || payload?.page || 1);
      const pageSize = +(
        payload?.pagination?.pageSize ||
        payload?.pageSize ||
        10
      );
      const sortField =
        payload?.pagination?.sortField || payload?.sortField || "updated_at";
      const sortOrder =
        payload?.pagination?.sortOrder || payload?.sortOrder || "DESC";

      const qb = this.taskRepo.createQueryBuilder("task");
      await this.applyRoleFilters(qb, currentUser);

      const safeFilters = { ...payload };
      delete safeFilters.pagination;
      delete safeFilters.page;
      delete safeFilters.pageSize;
      delete safeFilters.sortField;
      delete safeFilters.sortOrder;

      if (safeFilters.filters) {
        Object.assign(safeFilters, safeFilters.filters);
        delete safeFilters.filters;
      }

      // Handle department filter
      let departmentFilter: string | undefined = undefined;
      if (safeFilters.department) {
        departmentFilter = safeFilters.department;
        delete safeFilters.department;
      }

      // Explicit project / program filter (exact match)
      let projectNameFilter: string | undefined = undefined;
      if (
        safeFilters.project_name !== undefined &&
        safeFilters.project_name !== null &&
        String(safeFilters.project_name).trim() !== ""
      ) {
        projectNameFilter = String(safeFilters.project_name).trim();
        delete safeFilters.project_name;
      }

      let viewTypeFilter: string | undefined = undefined;
      if (safeFilters.view_type) {
        viewTypeFilter = safeFilters.view_type;
        delete safeFilters.view_type;
      }

      delete safeFilters.strictDepartment;

      const startDate = safeFilters.start_date;
      const endDate = safeFilters.end_date;
      const exactDate = safeFilters.date;
      delete safeFilters.start_date;
      delete safeFilters.end_date;
      delete safeFilters.date;

      const assigneeIdRaw =
        safeFilters.assignee_id ?? safeFilters.assigned_user_id;
      delete safeFilters.assignee_id;
      delete safeFilters.assigned_user_id;

      const teamFilter = this.dataScopeService.parseTeamFilter(
        safeFilters.team_filter,
        safeFilters.team_filter_user_id,
      );
      delete safeFilters.team_filter;
      delete safeFilters.team_filter_user_id;

      // Declare searchTerm and userNameFilter early
      const searchTerm = safeFilters.search;
      const userNameFilter = safeFilters.user_name;

      if (startDate) {
        qb.andWhere("task.created_at >= :start_date", {
          start_date: startDate,
        });
      }
      if (endDate) {
        qb.andWhere("task.created_at <= :end_date", { end_date: endDate });
      }
      if (exactDate) {
        qb.andWhere("DATE(task.created_at) = :exact_date", {
          exact_date: exactDate,
        });
      }

      if (
        assigneeIdRaw !== undefined &&
        assigneeIdRaw !== null &&
        assigneeIdRaw !== ""
      ) {
        const assigneeId = Number(assigneeIdRaw);
        if (!isNaN(assigneeId)) {
          qb.andWhere(
            new Brackets((dqb) => {
              dqb.where("task.assigned_user_ids @> ARRAY[:assigneeId]::int[]", {
                assigneeId,
              });
              dqb.orWhere("task.assigned_users_meta @> :metaObj::jsonb", {
                metaObj: JSON.stringify([{ user_id: assigneeId }]),
              });
            }),
          );
        }
      }

      if (
        teamFilter &&
        teamFilter.mode &&
        teamFilter.mode !== "all" &&
        currentUser?.id
      ) {
        // Team filter narrows assignees within reporting tree (list UI).
        // Access-scope ceiling is applied separately via role/visibility filters.
        const baseScope = {
          bypass: false,
          type: "org" as const,
          allowedUserIds: null as number[] | null,
          userId: Number(currentUser.id),
          userDepartment: currentUser.department,
        };
        const narrowed = await this.dataScopeService.narrowScopeWithTeamFilter(
          baseScope,
          teamFilter,
        );
        this.dataScopeService.applyUserIdsFilter(
          qb,
          narrowed.allowedUserIds || [],
          {
            intArrayColumn: "task.assigned_user_ids",
            jsonbUserIdsColumn: "task.assigned_users_meta",
            paramKey: "taskTeamFilter",
          },
        );
      }

      // Handle search filter - extend to include assigned user names
      if (searchTerm && searchTerm.trim() !== "") {
        qb.andWhere(
          new Brackets((searchQb) => {
            // Search in task fields
            searchQb.where("LOWER(task.title) LIKE :searchTerm", {
              searchTerm: `%${searchTerm.toLowerCase()}%`,
            });
            searchQb.orWhere("LOWER(task.description) LIKE :searchTerm", {
              searchTerm: `%${searchTerm.toLowerCase()}%`,
            });
            searchQb.orWhere("LOWER(task.project_name) LIKE :searchTerm", {
              searchTerm: `%${searchTerm.toLowerCase()}%`,
            });
            // Search in assigned user names from assigned_users_meta
            searchQb.orWhere(
              "EXISTS (SELECT 1 FROM jsonb_array_elements(task.assigned_users_meta) AS assignee WHERE LOWER(assignee->>'name') LIKE :searchTerm)",
              { searchTerm: `%${searchTerm.toLowerCase()}%` },
            );
          }),
        );

        // Remove search from safeFilters so applyCommonFilters doesn't duplicate it
        delete safeFilters.search;
      }

      // Handle user name filter - dedicated filter for searching by assigned user name
      if (userNameFilter && userNameFilter.trim() !== "") {
        const userSearchTerm = `%${userNameFilter.toLowerCase()}%`;

        qb.andWhere(
          "EXISTS (SELECT 1 FROM jsonb_array_elements(task.assigned_users_meta) AS assignee WHERE LOWER(assignee->>'name') LIKE :userName)",
          { userName: userSearchTerm },
        );
      }

      // Remove user_name from safeFilters so it's not passed to applyCommonFilters
      delete safeFilters.user_name;

      // Now make a copy of safeFilters for count query builder
      const countSafeFilters = { ...safeFilters };
      
      // Clean up countSafeFilters to remove any extra fields we don't want (like reported_to)
      const countExcludeFields = ["reported_to"];
      countExcludeFields.forEach(field => delete countSafeFilters[field]);

      applyCommonFilters(qb, safeFilters, this.searchableColumns, "task");

      if (projectNameFilter) {
        qb.andWhere("task.project_name = :projectNameFilter", {
          projectNameFilter,
        });
      }

      await this.applyViewTypeFilter(qb, viewTypeFilter, currentUser);

      await this.applyDepartmentUsersFilter(qb, departmentFilter);

      const validSort = [
        "title",
        "priority",
        "status",
        "department",
        "due_date",
        "created_at",
        "updated_at",
      ];
      const sortName = validSort.includes(sortField) ? sortField : "updated_at";
      qb.orderBy(`task.${sortName}`, sortOrder as "ASC" | "DESC");

      const skip = (page - 1) * pageSize;
      if (pageSize !== -1) {
        qb.skip(skip).take(pageSize);
      }

      const [data, total] = await qb.getManyAndCount();

      // Calculate category-specific counts
      let assignedToMeCount = 0;
      let assignedToTeamCount = 0;
      let otherTasksCount = 0;
      let approvalTasksCount = 0;

      // Create a separate query builder for counts (without pagination)
      const countQb = this.taskRepo.createQueryBuilder("task");
      await this.applyRoleFilters(countQb, currentUser);

      // Apply all the same filters to countQb as we did to qb
      if (startDate) {
        countQb.andWhere("task.created_at >= :start_date", {
          start_date: startDate,
        });
      }
      if (endDate) {
        countQb.andWhere("task.created_at <= :end_date", { end_date: endDate });
      }
      if (exactDate) {
        countQb.andWhere("DATE(task.created_at) = :exact_date", {
          exact_date: exactDate,
        });
      }

      if (
        assigneeIdRaw !== undefined &&
        assigneeIdRaw !== null &&
        assigneeIdRaw !== ""
      ) {
        const assigneeId = Number(assigneeIdRaw);
        if (!isNaN(assigneeId)) {
          countQb.andWhere(
            new Brackets((dqb) => {
              dqb.where("task.assigned_user_ids @> ARRAY[:assigneeId]::int[]", {
                assigneeId,
              });
              dqb.orWhere("task.assigned_users_meta @> :metaObj::jsonb", {
                metaObj: JSON.stringify([{ user_id: assigneeId }]),
              });
            }),
          );
        }
      }

      // Handle search filter
      if (searchTerm && searchTerm.trim() !== "") {
        countQb.andWhere(
          new Brackets((searchQb) => {
            searchQb.where("LOWER(task.title) LIKE :searchTerm", {
              searchTerm: `%${searchTerm.toLowerCase()}%`,
            });
            searchQb.orWhere("LOWER(task.description) LIKE :searchTerm", {
              searchTerm: `%${searchTerm.toLowerCase()}%`,
            });
            searchQb.orWhere("LOWER(task.project_name) LIKE :searchTerm", {
              searchTerm: `%${searchTerm.toLowerCase()}%`,
            });
            searchQb.orWhere(
              "EXISTS (SELECT 1 FROM jsonb_array_elements(task.assigned_users_meta) AS assignee WHERE LOWER(assignee->>'name') LIKE :searchTerm)",
              { searchTerm: `%${searchTerm.toLowerCase()}%` },
            );
          }),
        );
      }

      // Handle user name filter
      if (userNameFilter && userNameFilter.trim() !== "") {
        const userSearchTerm = `%${userNameFilter.toLowerCase()}%`;
        countQb.andWhere(
          "EXISTS (SELECT 1 FROM jsonb_array_elements(task.assigned_users_meta) AS assignee WHERE LOWER(assignee->>'name') LIKE :userName)",
          { userName: userSearchTerm },
        );
      }

      // Apply common filters
      applyCommonFilters(countQb, countSafeFilters, this.searchableColumns, "task");

      if (projectNameFilter) {
        countQb.andWhere("task.project_name = :projectNameFilter", {
          projectNameFilter,
        });
      }

      await this.applyDepartmentUsersFilter(countQb, departmentFilter, "Count");

      // Calculate assigned_to_me count
      if (currentUser) {
        const assignedToMeQb = countQb.clone();
        assignedToMeQb.andWhere(
          new Brackets((dqb) => {
            dqb.where("task.assigned_user_ids @> ARRAY[:currentUserId]::int[]", {
              currentUserId: currentUser.id,
            });
            dqb.orWhere(
              "EXISTS (SELECT 1 FROM jsonb_array_elements(task.assigned_users_meta) AS assignee WHERE (assignee->>'user_id')::int = :currentUserId)",
              { currentUserId: currentUser.id },
            );
          }),
        );
        assignedToMeCount = await assignedToMeQb.getCount();

        // assigned_to_team count = reporting tree (not whole department)
        if (currentUser?.id) {
          const assignedToTeamQb = countQb.clone();
          await this.applyAssignedToTeamFilter(
            assignedToTeamQb,
            currentUser,
            "Count",
          );
          assignedToTeamCount = await assignedToTeamQb.getCount();
        }

        // Calculate other_tasks count (assigned by me = created by current user)
        const otherTasksQb = countQb.clone();
        otherTasksQb.andWhere("task.created_by_id = :currentUserId", {
          currentUserId: currentUser.id,
        });
        otherTasksCount = await otherTasksQb.getCount();

        // Calculate approval_tasks count (where current user is required approver)
        const approvalTasksQb = countQb.clone();
        approvalTasksQb.andWhere(
          "task.approval_required_user_ids @> ARRAY[:currentUserId]::int[]",
          { currentUserId: currentUser.id },
        );
        approvalTasksCount = await approvalTasksQb.getCount();
      }

      return {
          data,
          pagination: {
          page,
          pageSize,
          total,
          totalPages: pageSize === -1 ? 1 : Math.ceil(total / pageSize),
          hasNext: pageSize === -1 ? false : page < Math.ceil(total / pageSize),
          hasPrev: pageSize === -1 ? false : page > 1,
        },
        categoryCounts: {
          assigned_to_me: assignedToMeCount,
          assigned_to_team: assignedToTeamCount,
          other_tasks: otherTasksCount,
          approval_tasks: approvalTasksCount,
        },
      };
    } catch (e) {
      throw e;
    }
  }

  async getDashboardStats(filters: any, currentUser?: User) {
    try {
      const qb = this.taskRepo.createQueryBuilder("task");
      
      // Org-wide visibility is granted to:
      // 1. Role-based SUPER_ADMIN / ADMIN
      // 2. Any user with explicit super_admin permission
      // 3. Any user whose task reports permission has view_all === true
      const perms = currentUser
        ? await this.permissionsService.getUserPermissions(Number(currentUser.id))
        : null;
      const deptKey =
        currentUser?.department &&
        perms?.[currentUser.department]?.tasks
          ? currentUser.department
          : null;
      const modulePermissions =
        (deptKey ? perms?.[deptKey]?.tasks : null) ||
        perms?.admin?.tasks ||
        perms?.tasking?.tasks ||
        perms?.tasks ||
        {};
      const reports = modulePermissions?.reports || {};
      const isSuperAdminOrAdmin =
        currentUser &&
        (currentUser.role === UserRole.SUPER_ADMIN ||
          currentUser.role === UserRole.ADMIN ||
          (perms && (perms as any).super_admin === true) ||
          reports.view_all === true);

      if (filters.start_date) {
        qb.andWhere("task.created_at >= :start_date", {
          start_date: filters.start_date,
        });
      }
      if (filters.end_date) {
        qb.andWhere("task.created_at <= :end_date", {
          end_date: filters.end_date,
        });
      }
      if (filters.project_id) {
        qb.andWhere("task.project_id = :project_id", {
          project_id: filters.project_id,
        });
      }

      if (filters.view_type === "created" && currentUser) {
        qb.andWhere("task.created_by_id = :currentUserId", {
          currentUserId: currentUser.id,
        });
      } else if (filters.view_type === "assigned" && currentUser) {
        qb.andWhere(
          new Brackets((dqb) => {
            dqb.where(
              "task.assigned_user_ids @> ARRAY[:currentUserId]::int[]",
              { currentUserId: currentUser.id },
            );
            dqb.orWhere("task.assigned_users_meta @> :metaObj::jsonb", {
              metaObj: JSON.stringify([{ user_id: currentUser.id }]),
            });
          }),
        );
      } else if (filters.view_type === "assigned_to_team" && currentUser) {
        await this.applyAssignedToTeamFilter(qb, currentUser, "Dash");
      } else if (filters.view_type === "approval_tasks" && currentUser) {
        // Tasks where current user is an approver
        qb.andWhere(
          "task.approval_required_user_ids @> ARRAY[:currentUserId]::int[]",
          { currentUserId: currentUser.id },
        );
      }

      // Apply visibility filters last, in a single bracket to ensure correct logic
      if (!isSuperAdminOrAdmin) {
        qb.andWhere(
          new Brackets((mainQb) => {
            // First, include all tasks the user would normally see
            // (assigned, created, reported, dept head/manager sees dept tasks)
            this.applyRoleFiltersWithoutBrackets(mainQb, currentUser);

            // Then, if there's a department filter, also apply it as an option
            if (filters.department) {
              const lowerDept = String(filters.department).toLowerCase();
              mainQb.orWhere(
                new Brackets((dqb) => {
                  if (
                    filters.strictDepartment === true ||
                    filters.strictDepartment === "true"
                  ) {
                    dqb.where("task.department = :filterDept", {
                      filterDept: lowerDept,
                    });
                  } else {
                    dqb.where("task.assigned_users_meta @> :deptMeta::jsonb", {
                      deptMeta: JSON.stringify([{ department: lowerDept }]),
                    });
                    dqb.orWhere("task.department = :filterDept", {
                      filterDept: lowerDept,
                    });
                  }
                }),
              );
            }
          }),
        );
      } else {
        // Admin/super admin: just apply department filter if present
        if (filters.department) {
          const lowerDept = String(filters.department).toLowerCase();
          if (
            filters.strictDepartment === true ||
            filters.strictDepartment === "true"
          ) {
            qb.andWhere("task.department = :filterDept", {
              filterDept: lowerDept,
            });
          } else {
            qb.andWhere(
              new Brackets((dqb) => {
                dqb.where("task.assigned_users_meta @> :deptMeta::jsonb", {
                  deptMeta: JSON.stringify([{ department: lowerDept }]),
                });
                dqb.orWhere("task.department = :filterDept", {
                  filterDept: lowerDept,
                });
              }),
            );
          }
        }
      }

      const totalTasks = await qb.getCount();

      const statusBreakdown = await qb
        .clone()
        .select("task.status", "status")
        .addSelect("COUNT(task.id)", "count")
        .groupBy("task.status")
        .getRawMany();

      const priorityBreakdown = await qb
        .clone()
        .select("task.priority", "priority")
        .addSelect("COUNT(task.id)", "count")
        .groupBy("task.priority")
        .getRawMany();

      // Get all tasks first to process assignee departments
      const allTasks = await qb.clone().getMany();
      
      // Aggregate department breakdown by assignees
      const deptCountMap: Record<string, number> = {};
      const deptStatusMap: Record<string, Record<string, { count: number; tasks: any[] }>> = {};
      
      // Initialize department maps
      Object.values(Department).forEach((dept) => {
        deptCountMap[dept] = 0;
        deptStatusMap[dept] = {};
      });
      
      // Process each task
      for (const task of allTasks) {
        const taskAssigneeDepartments = new Set<string>();
        
        // Get unique departments from assigned_users_meta
        if (Array.isArray(task.assigned_users_meta) && task.assigned_users_meta.length > 0) {
          task.assigned_users_meta.forEach((meta) => {
            if (meta.department) {
              taskAssigneeDepartments.add(meta.department.toLowerCase());
            }
          });
        }
        
        // If no assignees, use task.department as fallback
        if (taskAssigneeDepartments.size === 0 && task.department) {
          taskAssigneeDepartments.add(task.department.toLowerCase());
        }
        
        // Count task for each relevant department
        taskAssigneeDepartments.forEach((dept) => {
          // Increment count
          deptCountMap[dept] = (deptCountMap[dept] || 0) + 1;
          
          // Update status breakdown
          const status = task.status || "open";
          if (!deptStatusMap[dept][status]) {
            deptStatusMap[dept][status] = { count: 0, tasks: [] };
          }
          deptStatusMap[dept][status].count++;
          deptStatusMap[dept][status].tasks.push({
            id: task.id,
            title: task.title,
          });
        });
      }

      // Build department breakdown, only including departments with tasks
      const departmentBreakdown = Object.values(Department)
        .map((dept) => ({
          department: dept,
          count: deptCountMap[dept] || 0,
        }))
        .filter((item) => item.count > 0);

      // Build department_status_breakdown including ALL departments from enum
      const departmentStatusBreakdown: Record<string, any> = {};
      Object.values(Department).forEach((dept) => {
        departmentStatusBreakdown[dept] = deptStatusMap[dept] || {};
      });

      const overdueTasks = await qb
        .clone()
        .andWhere("task.due_date < CURRENT_DATE")
        .andWhere("task.status NOT IN (:...completedStatuses)", {
          completedStatuses: [
            TaskStatus.COMPLETED,
            TaskStatus.CLOSED,
            TaskStatus.CANCELLED,
            TaskStatus.APPROVED,
          ],
        })
        .getCount();

      const completedTasks = await qb
        .clone()
        .andWhere("task.status IN (:...completedStatuses)", {
          completedStatuses: [
            TaskStatus.CLOSED,
            TaskStatus.COMPLETED,
            TaskStatus.APPROVED,
          ],
        })
        .getCount();

      const completionRate =
        totalTasks > 0 ? ((completedTasks / totalTasks) * 100).toFixed(2) : 0;

      return {
        total_tasks: totalTasks,
        status_breakdown: statusBreakdown.reduce(
          (acc, item) => ({ ...acc, [item.status]: +item.count }),
          {},
        ),
        priority_breakdown: priorityBreakdown.reduce(
          (acc, item) => ({ ...acc, [item.priority]: +item.count }),
          {},
        ),
        // departmentBreakdown is already { dept: count } object from our map, so convert array to object
        department_breakdown: departmentBreakdown.reduce(
          (acc, item) => ({ ...acc, [item.department]: +item.count }),
          {},
        ),
        // departmentStatusBreakdown is already an object, no need to reduce!
        department_status_breakdown: departmentStatusBreakdown,
        overdue_tasks: overdueTasks,
        completion_rate: parseFloat(completionRate as string),
      };
    } catch (e) {
      throw e;
    }
  }

  async getReports(query: any, currentUser?: User) {
    try {
      const dateField =
        query?.date_field === "completed"
          ? "task.completed_date"
          : "task.created_at";
      const qb = this.taskRepo.createQueryBuilder("task");
      
      // Org-wide visibility mirrors getDashboardStats logic above (role + perms)
      const perms = currentUser
        ? await this.permissionsService.getUserPermissions(Number(currentUser.id))
        : null;
      const deptKey =
        currentUser?.department &&
        perms?.[currentUser.department]?.tasks
          ? currentUser.department
          : null;
      const modulePermissions =
        (deptKey ? perms?.[deptKey]?.tasks : null) ||
        perms?.admin?.tasks ||
        perms?.tasking?.tasks ||
        perms?.tasks ||
        {};
      const reportsPerm = modulePermissions?.reports || {};
      const isSuperAdminOrAdmin =
        currentUser &&
        (currentUser.role === UserRole.SUPER_ADMIN ||
          currentUser.role === UserRole.ADMIN ||
          (perms && (perms as any).super_admin === true) ||
          reportsPerm.view_all === true);

      if (query.start_date) {
        qb.andWhere(`${dateField} >= :start_date`, {
          start_date: query.start_date,
        });
      }
      if (query.end_date) {
        qb.andWhere(`${dateField} <= :end_date`, { end_date: query.end_date });
      }
      if (query.project_id) {
        qb.andWhere("task.project_id = :project_id", {
          project_id: query.project_id,
        });
      }

      if (query.view_type === "created" && currentUser) {
        qb.andWhere("task.created_by_id = :currentUserId", {
          currentUserId: currentUser.id,
        });
      } else if (query.view_type === "assigned" && currentUser) {
        qb.andWhere(
          new Brackets((dqb) => {
            dqb.where(
              "task.assigned_user_ids @> ARRAY[:currentUserId]::int[]",
              { currentUserId: currentUser.id },
            );
            dqb.orWhere("task.assigned_users_meta @> :metaObj::jsonb", {
              metaObj: JSON.stringify([{ user_id: currentUser.id }]),
            });
          }),
        );
      } else if (query.view_type === "assigned_to_team" && currentUser) {
        await this.applyAssignedToTeamFilter(qb, currentUser, "Rpt");
      } else if (query.view_type === "approval_tasks" && currentUser) {
        // Tasks where current user is an approver
        qb.andWhere(
          "task.approval_required_user_ids @> ARRAY[:currentUserId]::int[]",
          { currentUserId: currentUser.id },
        );
      }

      // Apply visibility filters last, in a single bracket to ensure correct logic
      if (!isSuperAdminOrAdmin) {
        qb.andWhere(
          new Brackets((mainQb) => {
            // First, include all tasks the user would normally see
            // (assigned, created, reported, dept head/manager sees dept tasks)
            this.applyRoleFiltersWithoutBrackets(mainQb, currentUser);

            // Then, if there's a department filter, also apply it as an option
            if (query.department) {
              const lowerDept = String(query.department).toLowerCase();
              mainQb.orWhere(
                new Brackets((dqb) => {
                  if (
                    query.strictDepartment === true ||
                    query.strictDepartment === "true"
                  ) {
                    dqb.where("task.department = :filterDept", {
                      filterDept: lowerDept,
                    });
                  } else {
                    dqb.where("task.assigned_users_meta @> :deptMeta::jsonb", {
                      deptMeta: JSON.stringify([{ department: lowerDept }]),
                    });
                    dqb.orWhere("task.department = :filterDept", {
                      filterDept: lowerDept,
                    });
                  }
                }),
              );
            }
          }),
        );
      } else {
        // Admin/super admin: just apply department filter if present
        if (query.department) {
          const lowerDept = String(query.department).toLowerCase();
          if (
            query.strictDepartment === true ||
            query.strictDepartment === "true"
          ) {
            qb.andWhere("task.department = :filterDept", {
              filterDept: lowerDept,
            });
          } else {
            qb.andWhere(
              new Brackets((dqb) => {
                dqb.where("task.assigned_users_meta @> :deptMeta::jsonb", {
                  deptMeta: JSON.stringify([{ department: lowerDept }]),
                });
                dqb.orWhere("task.department = :filterDept", {
                  filterDept: lowerDept,
                });
              }),
            );
          }
        }
      }

      const tasks = await qb.getMany();

      const userCountsMap: Record<
        string,
        {
          label: string;
          name: string; // Added name property
          count: number;
          statuses: Record<string, number>;
          tasks: any[];
          in_progress_count: number;
          completed_count: number;
          overdue_count: number;
          role: string;
        }
      > = {};
      const projectCountsMap: Record<
        string,
        { count: number; statuses: Record<string, number>; tasks: any[] }
      > = {};
      let totalDays = 0;
      let completedCount = 0;

      // Collect all user IDs from tasks FIRST
      const allUserIds = new Set<number>();
      for (const t of tasks) {
        if (Array.isArray(t.assigned_user_ids)) {
          t.assigned_user_ids.forEach((id) => allUserIds.add(Number(id)));
        }
      }

      // Fetch all users that are assigned to any of the filtered tasks
      const usersListQuery = this.userRepo
        .createQueryBuilder("user")
        .where("(user.isActive = true OR user.isActive IS NULL)");

      // If there are user IDs in allUserIds, filter to include only those users
      if (allUserIds.size > 0) {
        usersListQuery.andWhere("user.id IN (:...userIds)", { 
          userIds: Array.from(allUserIds) 
        });
      }

      const usersList = await usersListQuery.getMany();

      // Build user names map
      const userNamesMap = new Map<
        number,
        { name: string; role: string; id: number }
      >();
      usersList.forEach((u) => {
        const name =
          `${u.first_name || ""} ${u.last_name || ""}`.trim() ||
          u.email ||
          `User #${u.id}`;
        userNamesMap.set(Number(u.id), { name, role: u.role, id: u.id });
      });

      // Initialize userCountsMap only with users in usersList
      usersList.forEach((u) => {
        const userId = Number(u.id);
        const name =
          `${u.first_name || ""} ${u.last_name || ""}`.trim() ||
          u.email ||
          `User #${u.id}`;
        userCountsMap[userId] = {
          label: name,
          name: name, // Explicit name field
          role: u.role,
          count: 0,
          statuses: {},
          tasks: [],
          in_progress_count: 0,
          completed_count: 0,
          overdue_count: 0,
        };
      });

      const now = new Date();
      now.setHours(0, 0, 0, 0);

      for (const t of tasks) {
        const isOverdue =
          t.due_date &&
          new Date(t.due_date) < now &&
          ![
            TaskStatus.CLOSED,
            TaskStatus.COMPLETED,
            TaskStatus.CANCELLED,
            TaskStatus.APPROVED,
          ].includes(t.status);

        if (
          Array.isArray(t.assigned_user_ids) &&
          t.assigned_user_ids.length > 0
        ) {
          for (const uid of t.assigned_user_ids) {
            const userId = Number(uid);
            // Only include users that are in our filtered usersList
            if (userCountsMap[userId]) {
              userCountsMap[userId].count++;

              // Track status breakdown
              const status = t.status || "open";
              userCountsMap[userId].statuses[status] =
                (userCountsMap[userId].statuses[status] || 0) + 1;

              // Store task details for tooltip
              const projectName = t.project_name || null;
              userCountsMap[userId].tasks.push({
                title: t.title,
                status: t.status,
                project: projectName,
                department: t.department,
              });

              if (t.status === TaskStatus.IN_PROGRESS) {
                userCountsMap[userId].in_progress_count++;
              }
              if (
                t.status === TaskStatus.CLOSED ||
                t.status === TaskStatus.COMPLETED ||
                t.status === TaskStatus.APPROVED
              ) {
                userCountsMap[userId].completed_count++;
              }
              if (isOverdue) {
                userCountsMap[userId].overdue_count++;
              }
            }
          }
        } else {
          const label = "Unassigned";
          if (!userCountsMap[label]) {
            userCountsMap[label] = {
              label: "Unassigned",
              name: "Unassigned",
              count: 0,
              statuses: {},
              tasks: [],
              in_progress_count: 0,
              completed_count: 0,
              overdue_count: 0,
              role: "",
            };
          }
          userCountsMap[label].count++;

          // Track status breakdown
          const status = t.status || "open";
          userCountsMap[label].statuses[status] =
            (userCountsMap[label].statuses[status] || 0) + 1;

          // Store task details for tooltip
          const projectName = t.project_name || null;
          userCountsMap[label].tasks.push({
            title: t.title,
            status: t.status,
            project: projectName,
            department: t.department,
          });

          if (t.status === TaskStatus.IN_PROGRESS) {
            userCountsMap[label].in_progress_count++;
          }
          if (
            t.status === TaskStatus.CLOSED ||
            t.status === TaskStatus.COMPLETED ||
            t.status === TaskStatus.APPROVED
          ) {
            userCountsMap[label].completed_count++;
          }
          if (isOverdue) {
            userCountsMap[label].overdue_count++;
          }
        }

        const projectKey = t.project_name || "No Project";
        if (!projectCountsMap[projectKey]) {
          projectCountsMap[projectKey] = {
            count: 0,
            statuses: {},
            tasks: [],
          };
        }
        projectCountsMap[projectKey].count++;

        // Track status breakdown
        const status = t.status || "open";
        projectCountsMap[projectKey].statuses[status] =
          (projectCountsMap[projectKey].statuses[status] || 0) + 1;

        // Store task details for tooltip
        const assignees = t.assigned_user_ids
          ? t.assigned_user_ids
              .map((id) => userNamesMap.get(Number(id))?.name)
              .filter(Boolean)
          : [];

        projectCountsMap[projectKey].tasks.push({
          title: t.title,
          department: t.department,
          status: t.status,
          assignees: assignees,
          assignee_names: assignees.join(", ") || "Unassigned",
        });

        if (t.start_date && t.completed_date) {
          const start = new Date(t.start_date);
          const completed = new Date(t.completed_date);
          const diffMs = completed.getTime() - start.getTime();
          const days = diffMs / (1000 * 60 * 60 * 24);
          if (!isNaN(days) && days >= 0) {
            totalDays += days;
            completedCount += 1;
          }
        }
      }

      const users = Object.entries(userCountsMap)
        .filter(([id, item]: [string, any]) => item.count > 0) // Only include users with tasks
        .filter(([id, item]: [string, any]) => {
          // Exclude logged-in user when "Created by Me" filter is active
          if (query.view_type === "created" && currentUser) {
            return Number(id) !== Number(currentUser.id);
          }
          return true;
        })
        .map(([id, item]: [string, any]) => ({
          id: isNaN(Number(id)) ? null : Number(id),
          label: item.label,
          name: item.label, // Add name field as well for compatibility
          count: item.count,
          statuses: item.statuses,
          tasks: item.tasks.slice(0, 100), // Limit to 100 tasks for performance
          in_progress_count: item.in_progress_count,
          completed_count: item.completed_count,
          overdue_count: item.overdue_count,
          role: item.role,
          rate:
            item.count > 0
              ? parseFloat(
                  ((item.completed_count / item.count) * 100).toFixed(1),
                )
              : 0,
        }));
      const projects = Object.entries(projectCountsMap).map(
        ([label, data]) => ({
          label,
          count: data.count,
          statuses: data.statuses,
          tasks: data.tasks.slice(0, 100), // Limit to 100 tasks for performance
        }),
      );
      const avgCompletionDays =
        completedCount > 0 ? +(totalDays / completedCount).toFixed(2) : null;

      const stats = await this.getDashboardStats(
        {
          start_date: query.start_date,
          end_date: query.end_date,
          department: query.department,
          project_id: query.project_id,
          view_type: query.view_type,
        },
        currentUser,
      );

      return {
        users,
        projects,
        avgCompletionDays,
        stats,
      };
    } catch (e) {
      throw e;
    }
  }

  async findOne(
    id: number,
    currentUser?: User,
    options: { filterMov?: boolean } = {},
  ): Promise<Task> {
    try {
      const qb = this.taskRepo
        .createQueryBuilder("task")
        .where("task.id = :id", { id })
        .leftJoinAndSelect("task.attachments", "attachments")
        .leftJoinAndSelect("task.comments", "comments")
        .leftJoinAndSelect("comments.author", "comment_author")
        .leftJoinAndSelect("task.activities", "activities")
        .leftJoinAndSelect("activities.performed_by", "activity_performed_by")
        .leftJoinAndSelect("task.reported_by", "reported_by")
        .leftJoinAndSelect("task.created_by", "created_by")
        .leftJoinAndSelect("task.updated_by", "updated_by");

      const task = await qb.getOne();
      if (!task) {
        throw new NotFoundException("Task not found");
      }

      if (currentUser) {
        const perms = await this.getTaskPermissionsForUser(currentUser);
        const userId = Number(currentUser.id);
        const assignedIds = Array.isArray(task.assigned_user_ids)
          ? task.assigned_user_ids
              .map((v) => Number(v))
              .filter((v) => !isNaN(v))
          : [];
        const approverIds = Array.isArray(task.approval_required_user_ids)
          ? task.approval_required_user_ids
              .map((v) => Number(v))
              .filter((v) => !isNaN(v))
          : [];
        const isAssignee = assignedIds.includes(userId);
        const isApprover = approverIds.includes(userId);
        const isReporterOrCreator =
          (task.reported_by_id != null &&
            Number(task.reported_by_id) === userId) ||
          (task.created_by_id != null && Number(task.created_by_id) === userId);

        // E. Check if user is a manager of any assigned user's department
        const isManagerOfAssignee =
          currentUser.department &&
          (currentUser.role === UserRole.DEPT_HEAD ||
            currentUser.role === UserRole.MANAGER ||
            currentUser.role === UserRole.TEAM_LEAD) &&
          Array.isArray(task.assigned_users_meta) &&
          task.assigned_users_meta.some(
            (meta) => meta.department === currentUser.department,
          );

        const isAdminRole =
          currentUser.role === UserRole.SUPER_ADMIN ||
          currentUser.role === UserRole.ADMIN;

        if (
          !perms.canView &&
          !isAdminRole &&
          !isAssignee &&
          !isApprover &&
          !isReporterOrCreator &&
          !isManagerOfAssignee
        ) {
          throw new ForbiddenException(
            "Insufficient permissions to view this task",
          );
        }
      }

      // Add recurrence info if applicable
      const recurrence_info = this.calculateRecurrenceInfo(task);
      if (recurrence_info) {
        (task as any).recurrence_info = recurrence_info;
      }

      // Backward compatibility: extract MOV items from description and clean up description
      const movHeader = "[MOV CHECKLIST]";
      if (!Array.isArray(task.mov_items) || task.mov_items.length === 0) {
        const desc = task.description || "";
        const movStartIndex = desc.indexOf(movHeader);
        if (movStartIndex !== -1) {
          // Extract MOV items
          const extractedMovItems = desc
            .substring(movStartIndex + movHeader.length)
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.startsWith("-"))
            .map((line) => line.substring(1).trim());
          
          // Set extracted MOV items to task.mov_items
          if (extractedMovItems.length > 0) {
            task.mov_items = extractedMovItems;
          }
          
          // Clean up description by removing MOV checklist
          task.description = desc.substring(0, movStartIndex).trim();
        }
      } else {
        // If we already have mov_items, make sure description is clean
        const desc = task.description || "";
        const movStartIndex = desc.indexOf(movHeader);
        if (movStartIndex !== -1) {
          task.description = desc.substring(0, movStartIndex).trim();
        }
      }

      const isTaskCreator =
        currentUser && Number(task.created_by_id) === Number(currentUser.id);
      if (currentUser && options.filterMov !== false && !isTaskCreator) {
        this.filterMovItemsForUser(task, currentUser);
      }

      return task;
    } catch (e) {
      throw e;
    }
  }

  private filterMovItemsForUser(task: Task, currentUser: User): void {
    const assignments = Array.isArray(task.mov_assignments)
      ? task.mov_assignments
      : [];

    // Older tasks have no per-MOV assignments, so retain their existing visibility.
    if (assignments.length === 0) return;

    const userId = Number(currentUser.id);
    const visibleIndices = new Set(
      assignments
        .filter((item) => Number(item.user_id) === userId)
        .map((item) => Number(item.mov_index))
        .filter((index) => Number.isInteger(index) && index >= 0),
    );

    (task as any).mov_item_count = Array.isArray(task.mov_items)
      ? task.mov_items.length
      : 0;
    (task as any).mov_item_indices = Array.from(visibleIndices).sort(
      (a, b) => a - b,
    );
    task.mov_items = (task.mov_items || []).filter((_item, index) =>
      visibleIndices.has(index),
    );
    task.mov_assignments = assignments.filter((item) =>
      visibleIndices.has(Number(item.mov_index)),
    );
  }

  async update(
    id: number,
    dto: UpdateTaskDto,
    currentUser: User,
  ): Promise<Task> {
    try {
      const task = await this.findOne(id, currentUser, { filterMov: false });
      const perms = await this.getTaskPermissionsForUser(currentUser);

      const assignedIds = Array.isArray(task.assigned_user_ids)
        ? task.assigned_user_ids.map((v) => Number(v)).filter((v) => !isNaN(v))
        : [];
      const metaIds = Array.isArray(task.assigned_users_meta)
        ? task.assigned_users_meta
            .map((meta: any) =>
              meta && meta.user_id != null ? Number(meta.user_id) : null,
            )
            .filter((v) => v !== null && !isNaN(v as number))
        : [];
      const isCurrentUserAssignee = [...assignedIds, ...metaIds].includes(
        Number(currentUser.id),
      );
      const isApprovalSubmission =
        dto.status === TaskStatus.PENDING_APPROVAL &&
        task.workflow_type === TaskWorkflowType.APPROVAL_REQUIRED &&
        isCurrentUserAssignee;

      if (!isApprovalSubmission) {
        this.assertTaskMutationAllowed(task, currentUser, "update", perms);
      }
      // If user is trying to CLOSE a COMPLETED task, allow it if they are the creator or reporter
      if (
        task.status === TaskStatus.COMPLETED &&
        dto.status === TaskStatus.CLOSED
      ) {
        const isCreator = task.created_by_id === currentUser.id;
        const isReporter = task.reported_by_id === currentUser.id;
        const isAdmin =
          currentUser.role === UserRole.SUPER_ADMIN ||
          currentUser.role === UserRole.ADMIN;

        if (!isCreator && !isReporter && !isAdmin) {
          throw new ForbiddenException(
            "Only the creator, assigner, or an Admin can close this task.",
          );
        }
      }

      const oldStatus = task.status;

      if (dto.status && dto.status !== oldStatus) {
        const allowedTransitions: Record<string, TaskStatus[]> = {
          [TaskStatus.DRAFT]: [TaskStatus.OPEN],
          [TaskStatus.OPEN]: [TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED],
          [TaskStatus.IN_PROGRESS]: [
            TaskStatus.COMPLETED,
            TaskStatus.CANCELLED,
            TaskStatus.BLOCKED,
          ],
          [TaskStatus.BLOCKED]: [TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED],
          [TaskStatus.COMPLETED]:
            task.workflow_type === TaskWorkflowType.APPROVAL_REQUIRED
              ? [TaskStatus.PENDING_APPROVAL, TaskStatus.IN_PROGRESS]
              : [TaskStatus.CLOSED, TaskStatus.IN_PROGRESS],
          [TaskStatus.PENDING_APPROVAL]: [
            TaskStatus.APPROVED,
            TaskStatus.REJECTED,
            TaskStatus.CLOSED,
            TaskStatus.IN_PROGRESS,
          ],
          [TaskStatus.APPROVED]: [TaskStatus.CLOSED],
          [TaskStatus.REJECTED]: [TaskStatus.IN_PROGRESS, TaskStatus.CANCELLED],
          [TaskStatus.CLOSED]: [],
          [TaskStatus.CANCELLED]: [],
        };

        const validNext = allowedTransitions[oldStatus] || [];
        if (!validNext.includes(dto.status)) {
          throw new ConflictException(
            `Invalid status transition from ${oldStatus} to ${dto.status}`,
          );
        }
      } else {
        if (
          oldStatus === TaskStatus.CLOSED ||
          oldStatus === TaskStatus.CANCELLED
        ) {
          throw new ConflictException("Cannot edit Closed/Cancelled tasks");
        }
      }

      let newCompletedDate = task.completed_date;
      let shouldResetApprovalWorkflow = false;
      let shouldResetApprovalsForRework = false;
      let newProgress = task.progress;
      const nextStatus = dto.status ?? oldStatus;

      let assignedUsersMeta = task.assigned_users_meta;
      const previousAssignedUserIds = Array.isArray(task.assigned_user_ids)
        ? [...task.assigned_user_ids]
        : [];
      const previousApproverIds = Array.isArray(task.approval_required_user_ids)
        ? [...task.approval_required_user_ids]
        : [];
      const previousStatus = task.status;
      if (Array.isArray(dto.assigned_users)) {
        assignedUsersMeta = await this.getAssignedUsersMeta(dto.assigned_users);
      }

      if (dto.status && dto.status !== oldStatus) {
        const workflowType =
          dto.workflow_type !== undefined
            ? dto.workflow_type
            : task.workflow_type;

        if (workflowType === TaskWorkflowType.STANDARD) {
          if (dto.status === TaskStatus.COMPLETED) {
            newCompletedDate = newCompletedDate ?? new Date();
          }
        } else if (workflowType === TaskWorkflowType.APPROVAL_REQUIRED) {
          if (dto.status === TaskStatus.APPROVED) {
            newCompletedDate = newCompletedDate ?? new Date();
          }
        }
      }

      const isApprovalWorkflow =
        task.workflow_type === TaskWorkflowType.APPROVAL_REQUIRED ||
        dto.workflow_type === TaskWorkflowType.APPROVAL_REQUIRED;
      if (
        isApprovalWorkflow &&
        nextStatus === TaskStatus.OPEN &&
        task.completed_date
      ) {
        shouldResetApprovalWorkflow = true;
        newCompletedDate = null;
        newProgress = 0;
      }
      if (
        isApprovalWorkflow &&
        oldStatus === TaskStatus.REJECTED &&
        nextStatus === TaskStatus.IN_PROGRESS
      ) {
        shouldResetApprovalsForRework = true;
      }

      let updatedApprovedByIds = task.approved_by_id;
      let updatedRejectedByIds = task.rejected_by_id;

      if (shouldResetApprovalWorkflow || shouldResetApprovalsForRework) {
        const approvers = Array.isArray(task.approval_required_user_ids)
          ? task.approval_required_user_ids
              .map((v) => Number(v))
              .filter((v) => !isNaN(v))
          : [];
        if (approvers.length > 0) {
          await this.setTaskApprovalMeta(
            task.id,
            approvers.map((userId) => ({
              user_id: userId,
              decision: "pending" as const,
            })),
          );
        } else {
          await this.setTaskApprovalMeta(task.id, null);
        }
        updatedApprovedByIds = null;
        updatedRejectedByIds = null;
      }

      // Determine final MOV items (use dto.mov_items if provided, else existing)
      let finalMovItems = Array.isArray(dto.mov_items) && dto.mov_items.length > 0
        ? dto.mov_items
        : task.mov_items;
      const assignedUserIds = new Set(
        (Array.isArray(dto.assigned_users)
          ? dto.assigned_users
          : task.assigned_user_ids || []
        ).map((id) => Number(id)),
      );
      const movAssignments = Array.isArray(dto.mov_assignments)
        ? dto.mov_assignments.filter(
            (item) =>
              Number.isInteger(Number(item.mov_index)) &&
              (item.user_id == null || assignedUserIds.has(Number(item.user_id))),
          )
        : task.mov_assignments;

      // Determine final description: only the actual task description, no MOV items
      let finalDescription = task.description;
      if (dto.description != null) {
        finalDescription = dto.description;
      }

      // Backward compatibility: if we don't have mov_items but do have MOV checklist in description, extract it
      if (!Array.isArray(finalMovItems) || finalMovItems.length === 0) {
        const movHeader = "[MOV CHECKLIST]";
        const movStartIndex = finalDescription.indexOf(movHeader);
        if (movStartIndex !== -1) {
          // Extract MOV items from description
          const extractedMovItems = finalDescription
            .substring(movStartIndex + movHeader.length)
            .split("\n")
            .map((line) => line.trim())
            .filter((line) => line.startsWith("-"))
            .map((line) => line.substring(1).trim());
          
          // Update finalDescription to remove MOV checklist
          finalDescription = finalDescription.substring(0, movStartIndex).trim();
          
          // Set extracted items as final mov_items if we have any
          if (extractedMovItems.length > 0) {
            finalMovItems = extractedMovItems;
          }
        }
      }

      const oldDueDate = task.due_date ? new Date(task.due_date).getTime() : null;
      const newDueDate = dto.due_date ? new Date(dto.due_date).getTime() : oldDueDate;

      if (newDueDate !== oldDueDate) {
        task.overdue_email_sent = false;
      }

      const oldProgress = task.progress;
      Object.assign(task, {
        title: dto.title ?? task.title,
        description: finalDescription,
        department: dto.department ?? task.department,
        priority: dto.priority ?? task.priority,
        status: dto.status ?? task.status,
        workflow_type: dto.workflow_type ?? task.workflow_type,
        task_type: dto.task_type ?? task.task_type,
        start_date: dto.start_date ? new Date(dto.start_date) : task.start_date,
        due_date: dto.due_date ? new Date(dto.due_date) : task.due_date,
        completed_date: newCompletedDate,
        project_id: dto.project_id ?? task.project_id,
        project_name: dto.project_name ?? task.project_name,
        assigned_user_ids: Array.isArray(dto.assigned_users)
          ? dto.assigned_users
          : task.assigned_user_ids,
        assigned_users_meta: assignedUsersMeta,
        recurrence_rule: dto.recurrence_rule ?? task.recurrence_rule,
        recurrence_next_date: dto.recurrence_next_date
          ? new Date(dto.recurrence_next_date)
          : task.recurrence_next_date,
        recurrence_end_type:
          dto.recurrence_end_type ?? task.recurrence_end_type,
        recurrence_end_date: dto.recurrence_end_date
          ? new Date(dto.recurrence_end_date)
          : task.recurrence_end_date,
        recurrence_end_occurrences:
          dto.recurrence_end_occurrences ?? task.recurrence_end_occurrences,
        progress: newProgress,
        reported_by_id:
          typeof dto.reported_by_id === "number"
            ? dto.reported_by_id
            : task.reported_by_id,
        approval_required_user_ids: Array.isArray(
          dto.approval_required_user_ids,
        )
          ? dto.approval_required_user_ids
          : task.approval_required_user_ids,
        approved_by_id: updatedApprovedByIds,
        rejected_by_id: updatedRejectedByIds,
        updated_by_id: currentUser?.id ?? task.updated_by_id,
        mov_items: Array.isArray(finalMovItems) && finalMovItems.length > 0
          ? finalMovItems
          : task.mov_items,
        mov_assignments: movAssignments,
      });
      const saved = await this.taskRepo.save(task);

      if (saved.progress !== oldProgress) {
        await this.logActivity(saved, currentUser, "progress_updated", {
          from_progress: oldProgress,
          progress: saved.progress,
          notes: "Progress reset due to task reopening/rework.",
        });
      }
      await this.upsertTaskApprovalState(saved);
      if (shouldResetApprovalWorkflow) {
        await this.logActivity(
          saved,
          currentUser,
          "Task reopened – approval workflow reset",
          {},
        );

        const approverIds = Array.isArray(saved.approval_required_user_ids)
          ? saved.approval_required_user_ids
              .map((v) => Number(v))
              .filter((v) => !isNaN(v))
          : [];
        if (approverIds.length > 0) {
          const approvers = await this.userRepo
            .createQueryBuilder("user")
            .where("user.id IN (:...ids)", { ids: approverIds })
            .getMany();
          for (const u of approvers) {
            await this.createNotification(
              saved,
              u,
              TaskNotificationType.ASSIGNED,
            );
          }
        }
      }
      await this.logActivity(saved, currentUser, "updated", { changes: dto });

      if (newDueDate !== oldDueDate || dto.due_date === null || dto.due_date === "") {
        await this.deleteDueRemindersForTask(saved.id);
      }

      const terminalStatuses = [
        TaskStatus.COMPLETED,
        TaskStatus.CLOSED,
        TaskStatus.CANCELLED,
      ];
      if (terminalStatuses.includes(saved.status)) {
        await this.deleteDueRemindersForTask(saved.id);
      }

      if (Array.isArray(dto.assigned_users)) {
        const oldIds = new Set(
          previousAssignedUserIds.map((v) => Number(v)),
        );
        const newIds = new Set(
          (saved.assigned_user_ids || []).map((v) => Number(v)),
        );
        for (const uid of oldIds) {
          if (!newIds.has(uid)) {
            await this.deleteDueRemindersForTaskUser(saved.id, uid);
          }
        }

        await this.sendAssignmentNotifications(
          saved,
          this.getNewlyAssignedUserIds(
            previousAssignedUserIds,
            saved.assigned_user_ids,
          ),
          currentUser,
        );
      }

      if (Array.isArray(dto.approval_required_user_ids)) {
        await this.sendApproverNotifications(
          saved,
          this.getNewlyAssignedUserIds(
            previousApproverIds,
            saved.approval_required_user_ids,
          ),
          currentUser,
        );
      }

      if (dto.status !== undefined && previousStatus !== saved.status) {
        await this.sendStatusUpdateNotifications(
          saved,
          previousStatus,
          saved.status,
          currentUser,
        );
      }

      return this.findOne(saved.id, currentUser);
    } catch (e) {
      throw e;
    }
  }

  async transitionStatus(
    id: number,
    dto: StatusTransitionDto,
    currentUser: User,
  ): Promise<Task> {
    const task = await this.findOne(id, currentUser, { filterMov: false });
    const perms = await this.getTaskPermissionsForUser(currentUser);
    const assignedIds = Array.isArray(task.assigned_user_ids)
      ? task.assigned_user_ids.map((v) => Number(v)).filter((v) => !isNaN(v))
      : [];
    const metaIds = Array.isArray(task.assigned_users_meta)
      ? (task.assigned_users_meta
          .map((m: any) => (m && m.user_id != null ? Number(m.user_id) : null))
          .filter((v) => v !== null && !isNaN(v as number)) as number[])
      : [];
    const allAssignedIds = [...assignedIds, ...metaIds];
    const currentUserId = Number(currentUser.id);
    const isAssignee = allAssignedIds.includes(currentUserId);
    const isCreator = task.created_by_id === currentUserId;
    const isReporter = task.reported_by_id === currentUserId;
    const approvers = Array.isArray(task.approval_required_user_ids)
      ? task.approval_required_user_ids.map((v) => Number(v)).filter((v) => !isNaN(v))
      : [];
    const isConfiguredApprover = approvers.includes(currentUserId);

    if (!perms.canUpdate) {
      if (!perms.canView || (!isAssignee && !isCreator && !isReporter && !isConfiguredApprover)) {
        throw new ForbiddenException(
          "Insufficient permissions to change task status",
        );
      }
    }
    const workflowType = task.workflow_type;
    const nextStatus = dto.status;
    const isApprovalWorkflow =
      workflowType === TaskWorkflowType.APPROVAL_REQUIRED;
    const isAdminRole =
      currentUser.role === UserRole.SUPER_ADMIN ||
      currentUser.role === UserRole.ADMIN;
    if (
      isApprovalWorkflow &&
      [TaskStatus.CLOSED, TaskStatus.APPROVED, TaskStatus.REJECTED].includes(
        nextStatus,
      )
    ) {
      if (!perms.canApprove && !isAdminRole && !isCreator && !isReporter && !isConfiguredApprover) {
        throw new ForbiddenException(
          "Only approvers, admins, creators, or assigners can update this status",
        );
      }
    }
    if (
      nextStatus === TaskStatus.CLOSED &&
      !perms.canUpdate &&
      !isAdminRole &&
      !perms.canApprove &&
      !isCreator &&
      !isReporter &&
      !isConfiguredApprover
    ) {
      throw new ForbiddenException("Only authorized staff can close tasks");
    }
    const oldStatus = task.status;
    if (nextStatus === TaskStatus.COMPLETED && !dto.force_complete) {
      const completion = this.getMovCompletionSummary(task);
      if (completion.incompleteAssigneeCount > 0) {
        throw new ConflictException({
          code: "INCOMPLETE_MOV_CONFIRMATION_REQUIRED",
          message: `${completion.incompleteAssigneeCount} assignees still have incomplete MOVs.`,
          incomplete_assignee_count: completion.incompleteAssigneeCount,
        });
      }
    }
    const updated = await this.update(
      id,
      { status: dto.status } as UpdateTaskDto,
      currentUser,
    );
    if (
      isApprovalWorkflow &&
      dto.status === TaskStatus.PENDING_APPROVAL &&
      dto.notes
    ) {
      const approval = await this.taskApprovalRepo.findOne({
        where: { task_id: updated.id },
      });
      if (approval) {
        const existingNotes = Array.isArray(approval.submission_note)
          ? approval.submission_note
          : [];
        const noteEntry = {
          user_id: Number(currentUser.id),
          note: dto.notes.slice(0, 500),
          created_at: new Date(),
        };
        approval.submission_note = [...existingNotes, noteEntry];
        await this.taskApprovalRepo.save(approval);
      }
    }
    await this.logActivity(updated, currentUser, "status_transition", {
      from_status: oldStatus,
      to_status: updated.status,
      notes: dto.notes ? dto.notes.slice(0, 500) : undefined,
    });
    const terminalStatuses = [
      TaskStatus.COMPLETED,
      TaskStatus.CLOSED,
      TaskStatus.CANCELLED,
    ];
    if (terminalStatuses.includes(updated.status)) {
      await this.deleteDueRemindersForTask(updated.id);
    }
    return this.findOne(id, currentUser);
  }

  async assign(
    id: number,
    dto: AssignTaskDto,
    currentUser: User,
  ): Promise<Task> {
    try {
      const task = await this.findOne(id, currentUser, { filterMov: false });
      const oldAssignedUserIds = Array.isArray(task.assigned_user_ids)
        ? [...task.assigned_user_ids]
        : [];
      task.status =
        task.status === TaskStatus.DRAFT ? TaskStatus.OPEN : task.status;

      if (Array.isArray(dto.assigned_users)) {
        task.assigned_user_ids = dto.assigned_users;
        task.assigned_users_meta = await this.getAssignedUsersMeta(
          dto.assigned_users,
        );
      }

      if (
        Array.isArray(task.assigned_users_meta) &&
        task.assigned_users_meta.length > 0
      ) {
        const firstMeta = task.assigned_users_meta[0] as any;
        if (firstMeta && firstMeta.department) {
          task.department = firstMeta.department as any;
        }
      }

      const saved = await this.taskRepo.save(task);

      if (Array.isArray(dto.assigned_users) && oldAssignedUserIds.length > 0) {
        const oldSet = new Set(oldAssignedUserIds.map((v) => Number(v)));
        const newSet = new Set(
          (saved.assigned_user_ids || []).map((v) => Number(v)),
        );
        for (const uid of oldSet) {
          if (!newSet.has(uid)) {
            await this.deleteDueRemindersForTaskUser(saved.id, uid);
          }
        }
      }

      await this.logActivity(saved, currentUser, "assigned", {
        assigned_user_ids: saved.assigned_user_ids,
      });

      await this.sendAssignmentEmailsToAssignees(saved);
      await this.sendAssignmentNotifications(
        saved,
        this.getNewlyAssignedUserIds(oldAssignedUserIds, saved.assigned_user_ids),
        currentUser,
      );

      return saved;
    } catch (e) {
      throw e;
    }
  }

  async reassign(
    id: number,
    dto: AssignTaskDto,
    currentUser: User,
  ): Promise<Task> {
    try {
      const task = await this.findOne(id, currentUser);
      const currRole = String(currentUser.role).toLowerCase();
      if (
        currRole !== UserRole.SUPER_ADMIN &&
        currRole !== UserRole.ADMIN &&
        currRole !== UserRole.MANAGER &&
        currRole !== UserRole.ASSISTANT_MANAGER &&
        currRole !== UserRole.TEAM_LEAD &&
        currRole !== UserRole.DEPT_HEAD
      ) {
        throw new ForbiddenException(
          "Only Admin/Manager/Lead roles can reassign tasks",
        );
      }

      const oldAssignedUserIds = Array.isArray(task.assigned_user_ids)
        ? [...task.assigned_user_ids]
        : null;
      const oldAssignedUsersMeta = Array.isArray(task.assigned_users_meta)
        ? [...task.assigned_users_meta]
        : null;

      if (Array.isArray(dto.assigned_users)) {
        task.assigned_user_ids = dto.assigned_users;
        task.assigned_users_meta = await this.getAssignedUsersMeta(
          dto.assigned_users,
        );
      }

      const saved = await this.taskRepo.save(task);

      if (Array.isArray(dto.assigned_users) && oldAssignedUserIds) {
        const oldSet = new Set(oldAssignedUserIds.map((v) => Number(v)));
        const newSet = new Set(
          (saved.assigned_user_ids || []).map((v) => Number(v)),
        );
        for (const uid of oldSet) {
          if (!newSet.has(uid)) {
            await this.deleteDueRemindersForTaskUser(saved.id, uid);
          }
        }
      }

      const fromItems: any[] = [];
      const toItems: any[] = [];

      if (
        Array.isArray(oldAssignedUsersMeta) &&
        oldAssignedUsersMeta.length > 0
      ) {
        for (const m of oldAssignedUsersMeta) {
          if (!m) continue;
          fromItems.push({
            type: "from",
            user_id:
              typeof m.user_id === "number"
                ? m.user_id
                : Number(m.user_id) || null,
            department: m.department || null,
          });
        }
      } else if (
        Array.isArray(oldAssignedUserIds) &&
        oldAssignedUserIds.length > 0
      ) {
        for (const id of oldAssignedUserIds) {
          fromItems.push({
            type: "from",
            user_id: id,
            department: null,
          });
        }
      }

      if (
        Array.isArray(saved.assigned_users_meta) &&
        saved.assigned_users_meta.length > 0
      ) {
        for (const m of saved.assigned_users_meta as any[]) {
          if (!m) continue;
          toItems.push({
            type: "to",
            user_id:
              typeof m.user_id === "number"
                ? m.user_id
                : Number(m.user_id) || null,
            department: m.department || null,
          });
        }
      } else if (
        Array.isArray(saved.assigned_user_ids) &&
        saved.assigned_user_ids.length > 0
      ) {
        for (const id of saved.assigned_user_ids) {
          toItems.push({
            type: "to",
            user_id: id,
            department: null,
          });
        }
      }

      const details = [...fromItems, ...toItems];

      await this.logActivity(saved, currentUser, "reassigned", details);

      await this.sendAssignmentEmailsToAssignees(saved);
      await this.sendAssignmentNotifications(
        saved,
        this.getNewlyAssignedUserIds(
          oldAssignedUserIds,
          saved.assigned_user_ids,
        ),
        currentUser,
      );

      if (
        Array.isArray(saved.assigned_user_ids) &&
        saved.assigned_user_ids.length > 0
      ) {
        const users = await this.userRepo
          .createQueryBuilder("user")
          .where("user.id IN (:...ids)", { ids: saved.assigned_user_ids })
          .getMany();
        for (const u of users) {
          await this.createNotification(
            saved,
            u,
            TaskNotificationType.ASSIGNED,
          );
        }
      }

      return saved;
    } catch (e) {
      throw e;
    }
  }

  async approve(
    id: number,
    dto: ApproveTaskDto,
    currentUser: User,
  ): Promise<Task> {
    try {
      const task = await this.findOne(id, currentUser);
      if (task.workflow_type !== TaskWorkflowType.APPROVAL_REQUIRED) {
        throw new ConflictException("Task does not require approval");
      }
      const approvers = Array.isArray(task.approval_required_user_ids)
        ? task.approval_required_user_ids
            .map((v) => Number(v))
            .filter((v) => !isNaN(v))
        : [];
      const isAdminRole =
        currentUser.role === UserRole.SUPER_ADMIN ||
        currentUser.role === UserRole.ADMIN;
      if (approvers.length > 0 && !isAdminRole) {
        const isConfiguredApprover = approvers.includes(Number(currentUser.id));
        if (!isConfiguredApprover) {
          throw new ForbiddenException(
            "You are not configured as an approver for this task",
          );
        }
      }

      const now = new Date();
      const approvalState = await this.taskApprovalRepo.findOne({
        where: { task_id: task.id },
      });
      const existingMeta = Array.isArray(approvalState?.approvals_meta)
        ? (approvalState!.approvals_meta as {
            user_id: number;
            decision: "approved" | "rejected" | "pending";
            decided_at?: Date;
          }[])
        : [];
      const normalizedMeta = approvers.length
        ? approvers.map((userId) => {
            const existing = existingMeta.find(
              (m) => m && Number(m.user_id) === Number(userId),
            );
            if (existing) {
              return existing;
            }
            return {
              user_id: userId,
              decision: "pending" as const,
            };
          })
        : existingMeta;

      const updatedMeta: {
        user_id: number;
        decision: "approved" | "rejected" | "pending";
        decided_at?: Date;
      }[] = normalizedMeta.map((entry) => {
        if (Number(entry.user_id) !== Number(currentUser.id)) {
          return entry;
        }
        return {
          user_id: entry.user_id,
          decision: dto.approve ? "approved" : "rejected",
          decided_at: now,
        };
      });

      let newStatus = task.status;
      if (dto.approve) {
        if (approvers.length > 0) {
          const approverMeta = updatedMeta.filter((e) =>
            approvers.includes(Number(e.user_id)),
          );
          const allApproved =
            approverMeta.length > 0 &&
            approverMeta.every((e) => e.decision === "approved");
          const anyRejected =
            approverMeta.length > 0 &&
            approverMeta.some((e) => e.decision === "rejected");
          if (allApproved) {
            newStatus = TaskStatus.APPROVED;
          } else if (anyRejected) {
            newStatus = TaskStatus.REJECTED;
          } else {
            newStatus = TaskStatus.PENDING_APPROVAL;
          }
        } else {
          newStatus = TaskStatus.APPROVED;
        }
      } else {
        newStatus = TaskStatus.REJECTED;
      }

      const oldStatus = task.status;
      task.status = newStatus;
      const normalizedMetaForSave = updatedMeta.length > 0 ? updatedMeta : null;
      if (newStatus === TaskStatus.APPROVED) {
        const approvedUserIds = updatedMeta
          .filter((m) => m && m.decision === "approved")
          .map((m) => Number(m.user_id))
          .filter((n) => Number.isInteger(n) && n > 0);
        task.approved_by_id =
          approvedUserIds.length > 0 ? approvedUserIds : null;
        task.completed_date = task.completed_date ?? now;
        task.rejected_by_id = null;
      } else if (newStatus === TaskStatus.REJECTED) {
        const rejectedUserIds = updatedMeta
          .filter((m) => m && m.decision === "rejected")
          .map((m) => Number(m.user_id))
          .filter((n) => Number.isInteger(n) && n > 0);
        task.rejected_by_id =
          rejectedUserIds.length > 0 ? rejectedUserIds : null;
      }
      const saved = await this.taskRepo.save(task);
      await this.setTaskApprovalMeta(task.id, normalizedMetaForSave);
      await this.upsertTaskApprovalState(saved);
      if (dto.note) {
        const approvalRecord = await this.taskApprovalRepo.findOne({
          where: { task_id: task.id },
        });
        if (approvalRecord) {
          const trimmed = dto.note.slice(0, 500);
          if (dto.approve) {
            const existingApproved = Array.isArray(approvalRecord.approved_note)
              ? approvalRecord.approved_note
              : [];
            const entry = {
              user_id: Number(currentUser.id),
              note: trimmed,
              decided_at: now,
            };
            approvalRecord.approved_note = [...existingApproved, entry];
          } else {
            const existingRejected = Array.isArray(approvalRecord.rejected_note)
              ? approvalRecord.rejected_note
              : [];
            const entry = {
              user_id: Number(currentUser.id),
              note: trimmed,
              decided_at: now,
            };
            approvalRecord.rejected_note = [...existingRejected, entry];
          }
          await this.taskApprovalRepo.save(approvalRecord);
        }
      }
      await this.logActivity(
        saved,
        currentUser,
        dto.approve ? "approved" : "rejected",
        { note: dto.note },
      );
      await this.sendStatusUpdateNotifications(
        saved,
        oldStatus,
        saved.status,
        currentUser,
      );
      return saved;
    } catch (e) {
      throw e;
    }
  }

  async complete(id: number, currentUser: User): Promise<Task> {
    try {
      const task = await this.findOne(id, currentUser);
      const oldStatus = task.status;
      task.status = TaskStatus.COMPLETED;
      if (task.workflow_type === TaskWorkflowType.STANDARD) {
        task.completed_date = task.completed_date ?? new Date();
      }
      const saved = await this.taskRepo.save(task);
      await this.deleteDueRemindersForTask(saved.id);
      await this.logActivity(saved, currentUser, "completed", {});
      await this.sendStatusUpdateNotifications(
        saved,
        oldStatus,
        saved.status,
        currentUser,
      );
      return saved;
    } catch (e) {
      throw e;
    }
  }

  async getApprovalStateForTask(
    taskId: number,
    currentUser: User,
  ): Promise<TaskApproval | null> {
    await this.findOne(taskId, currentUser);
    const approval = await this.taskApprovalRepo.findOne({
      where: { task_id: taskId },
    });
    return approval || null;
  }

  async getApprovalsForUserDashboard(
    currentUser: User,
  ): Promise<TaskApproval[]> {
    const userId = Number(currentUser.id);
    if (!Number.isFinite(userId)) {
      return [];
    }
    const qb = this.taskApprovalRepo
      .createQueryBuilder("ta")
      .leftJoinAndSelect("ta.task", "task")
      .where("ta.approval_required_user_ids @> ARRAY[:userId]::int[]", {
        userId,
      })
      .andWhere("ta.approval_status IS NOT NULL");

    const approvals = await qb.getMany();
    return approvals;
  }

  async addAttachment(
    id: number,
    dto: AddAttachmentDto,
    currentUser: User,
  ): Promise<TaskAttachment> {
    try {
      const task = await this.findOne(id, currentUser);
      const att = this.attachmentRepo.create({
        task,
        file_name: dto.file_name,
        file_url: dto.file_url,
        file_type: dto.file_type,
        description: dto.description,
        is_initial: dto.is_initial || false,
        uploaded_by: currentUser,
      });
      const saved = await this.attachmentRepo.save(att);
      await this.logActivity(task, currentUser, "attachment_added", {
        file_name: dto.file_name,
      });
      return saved;
    } catch (e) {
      throw e;
    }
  }

  async removeAttachment(
    taskId: number,
    attachmentId: number,
    currentUser: User,
  ): Promise<{ deleted: boolean }> {
    try {
      const task = await this.findOne(taskId, currentUser);

      const attachment = await this.attachmentRepo.findOne({
        where: { id: attachmentId },
        relations: ["task"],
      });

      if (!attachment || !attachment.task || attachment.task.id !== task.id) {
        throw new NotFoundException("Attachment not found for this task");
      }

      if (attachment.file_url && attachment.file_url.startsWith("/files/")) {
        const relative = attachment.file_url.replace("/files/", "");
        const filePath = path.join(process.cwd(), "uploads", relative);
        try {
          await fs.promises.unlink(filePath);
        } catch {
          // ignore filesystem errors - metadata removal is still valid
        }
      }

      await this.attachmentRepo.remove(attachment);
      await this.logActivity(task, currentUser, "attachment_removed", {
        file_name: attachment.file_name,
      });

      return { deleted: true };
    } catch (e) {
      throw e;
    }
  }

  async addComment(
    id: number,
    dto: AddCommentDto,
    currentUser: User,
  ): Promise<TaskComment> {
    try {
      const task = await this.findOne(id, currentUser);
      const mentionedUserIds = Array.from(
        new Set(
          (dto.mentioned_user_ids || [])
            .map((v) => Number(v))
            .filter((v) => Number.isInteger(v) && v > 0),
        ),
      );
      const comment = this.commentRepo.create({
        task,
        content: dto.content,
        author: currentUser,
        mentioned_user_ids:
          mentionedUserIds.length > 0 ? mentionedUserIds : null,
      });
      const saved = await this.commentRepo.save(comment);
      const withAuthor = await this.commentRepo.findOne({
        where: { id: saved.id },
        relations: ["author"],
      });
      await this.logActivity(task, currentUser, "comment_added", {
        content: dto.content?.slice(0, 120),
        mentioned_user_ids: mentionedUserIds,
      });

      if (mentionedUserIds.length > 0) {
        await this.notifyMentionedUsersOnComment(
          task,
          dto.content,
          mentionedUserIds,
          currentUser,
        );
      }

      await this.sendCommentNotifications(
        task,
        dto.content,
        mentionedUserIds,
        currentUser,
      );

      return withAuthor || saved;
    } catch (e) {
      throw e;
    }
  }

  private async notifyMentionedUsersOnComment(
    task: Task,
    commentContent: string,
    mentionedUserIds: number[],
    author: User,
  ): Promise<void> {
    const authorId = Number(author.id);
    const recipientIds = mentionedUserIds.filter((uid) => uid !== authorId);
    if (recipientIds.length === 0) return;

    const users = await this.userRepo.find({
      where: { id: In(recipientIds) },
    });

    const authorName = this.userDisplayName(author) || "A colleague";

    for (const user of users) {
      if (!user?.email) continue;
      try {
        await this.emailService.sendTaskCommentMentionEmail(
          user,
          task,
          commentContent,
          authorName,
        );
      } catch (emailErr: any) {
        this.logger.warn(
          `Failed to send comment mention email to user ${user.id}: ${emailErr?.message}`,
        );
      }
    }
  }

  async getWorkHistory(
    id: number,
    currentUser: User,
  ): Promise<{
    entries: {
      id: number;
      seconds: number;
      created_at: Date;
      notes?: string | null;
    }[];
    total_seconds: number;
    active_entry: {
      id: number;
      started_at: Date;
    } | null;
  }> {
    const task = await this.findOne(id, currentUser);

    const entries = await this.timeEntryRepo.find({
      where: { task: { id: task.id } },
      order: { created_at: "DESC" },
    });

    const totalSeconds = entries.reduce(
      (acc, e) => acc + (Number(e.seconds) || 0),
      0,
    );

    const active = await this.timeEntryRepo.findOne({
      where: {
        task: { id: task.id },
        user: { id: currentUser.id },
        started_at: Not(IsNull()),
        stopped_at: IsNull(),
      },
      order: { created_at: "DESC" },
    });

    return {
      entries: entries.map((e) => ({
        id: e.id,
        seconds: e.seconds,
        created_at: e.created_at,
        notes: e.notes,
      })),
      total_seconds: totalSeconds,
      active_entry: active
        ? {
            id: active.id,
            started_at: active.started_at,
          }
        : null,
    };
  }

  async addTimeEntry(
    id: number,
    payload: { action: string; seconds?: number; notes?: string },
    currentUser: User,
  ): Promise<TaskTimeEntry | null> {
    const task = await this.findOne(id, currentUser);
    const action = (payload.action || "").toLowerCase();
    const now = new Date();

    if (action === "start") {
      const existing = await this.timeEntryRepo.findOne({
        where: {
          task: { id: task.id },
          user: { id: currentUser.id },
          started_at: Not(IsNull()),
          stopped_at: IsNull(),
        },
      });
      if (existing) {
        return existing;
      }
      const entry = this.timeEntryRepo.create({
        task,
        user: currentUser,
        seconds: 0,
        notes: payload.notes || null,
        started_at: now,
        stopped_at: null,
      });
      const saved = await this.timeEntryRepo.save(entry);
      await this.logActivity(task, currentUser, "time_started", {});
      return saved;
    }

    if (action === "stop") {
      const existing = await this.timeEntryRepo.findOne({
        where: {
          task: { id: task.id },
          user: { id: currentUser.id },
          started_at: Not(IsNull()),
          stopped_at: IsNull(),
        },
      });
      if (!existing || !existing.started_at) {
        return null;
      }
      const diffMs = now.getTime() - existing.started_at.getTime();
      const seconds = Math.max(0, Math.floor(diffMs / 1000));
      existing.seconds = seconds;
      existing.stopped_at = now;
      const saved = await this.timeEntryRepo.save(existing);
      await this.logActivity(task, currentUser, "time_stopped", {
        seconds,
      });
      return saved;
    }

    if (action === "manual") {
      const seconds = Math.max(0, Math.floor(Number(payload.seconds) || 0));
      if (!seconds) {
        return null;
      }
      const entry = this.timeEntryRepo.create({
        task,
        user: currentUser,
        seconds,
        notes: payload.notes || null,
        started_at: null,
        stopped_at: null,
      });
      const saved = await this.timeEntryRepo.save(entry);
      await this.logActivity(task, currentUser, "time_manual", {
        seconds,
      });
      return saved;
    }

    return null;
  }

  async updateProgress(
    id: number,
    payload: { progress: number; notes?: string },
    currentUser: User,
  ): Promise<Task> {
    const task = await this.findOne(id, currentUser, { filterMov: false });
    this.validateMovProgressAccess(task, payload.notes, currentUser);
    const mergedNotes = this.mergeMovProgressNotes(
      task.last_progress_notes,
      payload.notes,
      currentUser,
    );
    let value = Math.min(100, Math.max(0, Number(payload.progress) || 0));

    if (mergedNotes && Array.isArray(task.mov_items) && task.mov_items.length > 0) {
      const indicesMatch = mergedNotes.match(/\[indices:([^\]]*)\]/);
      const checkedCount = indicesMatch && indicesMatch[1]
        ? indicesMatch[1].split(',').filter(Boolean).length
        : 0;
      value = Math.round((checkedCount / task.mov_items.length) * 100);
    }

    // Donation pending follow-up: two mutually exclusive MOV items — one check = done.
    if (
      typeof task.project_id === "string" &&
      task.project_id.startsWith("donation-pending:") &&
      Array.isArray(task.mov_items) &&
      task.mov_items.length === 2 &&
      value >= 50 &&
      value < 100
    ) {
      value = 100;
    }

    const oldProgress = task.progress;
    const oldStatus = task.status;

    task.progress = value;
    task.last_progress_notes = mergedNotes || payload.notes || null;

    const completion = this.getMovCompletionSummary(task, mergedNotes);
    if (completion.hasAssignedMovs && completion.allMovsCompleted) {
      task.status = TaskStatus.COMPLETED;
      if (task.workflow_type === TaskWorkflowType.STANDARD) {
        task.completed_date = task.completed_date ?? new Date();
      }
    }

    // Automatically transition to IN_PROGRESS if the task is currently OPEN or DRAFT
    // and progress is being made (value > 0)
    if (
      value > 0 &&
      (task.status === TaskStatus.OPEN || task.status === TaskStatus.DRAFT)
    ) {
      task.status = TaskStatus.IN_PROGRESS;
    }

    await this.taskRepo.save(task);

    // Log status transition if it happened automatically
    if (task.status !== oldStatus) {
      await this.logActivity(task, currentUser, "status_transition", {
        from_status: oldStatus,
        to_status: task.status,
        notes:
          "Status automatically updated to In Progress due to MOV checklist activity.",
      });
    }

    // Only log activity if progress increased (i.e., an item was checked)
    if (value > oldProgress) {
      await this.logActivity(task, currentUser, "progress_updated", {
        progress: value,
        notes: payload.notes?.slice(0, 120),
      });
    }

    const refreshed = await this.findOne(id, currentUser);
    return refreshed;
  }

  private getMovCompletionSummary(
    task: Task,
    notes = task.last_progress_notes || "",
  ): {
    hasAssignedMovs: boolean;
    allMovsCompleted: boolean;
    incompleteAssigneeCount: number;
  } {
    const movItems = Array.isArray(task.mov_items) ? task.mov_items : [];
    const assignments = Array.isArray(task.mov_assignments)
      ? task.mov_assignments.filter((item) => Number.isInteger(Number(item.mov_index)))
      : [];
    const checkedMatch = String(notes || "").match(/\[indices:([^\]]*)\]/);
    const checkedIndices = new Set(
      checkedMatch && checkedMatch[1]
        ? checkedMatch[1].split(",").filter(Boolean).map(Number)
        : [],
    );

    if (assignments.length === 0) {
      const allCompleted = movItems.length === 0 || movItems.every((_item, index) => checkedIndices.has(index));
      return {
        hasAssignedMovs: false,
        allMovsCompleted: allCompleted,
        incompleteAssigneeCount: 0,
      };
    }

    const userCompletion = new Map<number, boolean>();
    assignments.forEach((item) => {
      const userId = Number(item.user_id);
      const movIndex = Number(item.mov_index);
      const complete = checkedIndices.has(movIndex);
      userCompletion.set(userId, (userCompletion.get(userId) ?? true) && complete);
    });

    const incompleteAssigneeCount = Array.from(userCompletion.values()).filter(
      (complete) => !complete,
    ).length;
    return {
      hasAssignedMovs: true,
      allMovsCompleted: incompleteAssigneeCount === 0,
      incompleteAssigneeCount,
    };
  }

  private validateMovProgressAccess(
    task: Task,
    notes: string | undefined,
    currentUser: User,
  ): void {
    const assignments = Array.isArray(task.mov_assignments)
      ? task.mov_assignments
      : [];
    if (assignments.length === 0) return;

    const isTaskCreator =
      Number(task.created_by_id) === Number(currentUser.id);
    const isAssignedToTask = Array.isArray(task.assigned_user_ids)
      && task.assigned_user_ids.some(
        (userId) => Number(userId) === Number(currentUser.id),
      );
    if (isTaskCreator && !isAssignedToTask) {
      throw new ForbiddenException(
        "The task creator must be assigned to the task to update MOVs.",
      );
    }
    if (!notes) return;

    const match = notes.match(/\[indices:([^\]]*)\]/);
    if (!match) return;

    const assignedIndices = new Set(
      assignments
        .filter((item) => Number(item.user_id) === Number(currentUser.id))
        .map((item) => Number(item.mov_index)),
    );
    const requestedIndices = match[1]
      .split(',')
      .filter(Boolean)
      .map(Number);

    if (requestedIndices.some((index) => !assignedIndices.has(index))) {
      throw new ForbiddenException(
        "You cannot access a MOV assigned to another user.",
      );
    }
  }

  private mergeMovProgressNotes(
    existingNotes: string | null | undefined,
    incomingNotes: string | undefined,
    currentUser: User,
  ): string | undefined {
    if (!incomingNotes) return incomingNotes;

    const incomingIndicesMatch = incomingNotes.match(/\[indices:([^\]]*)\]/);
    if (!incomingIndicesMatch) return incomingNotes;

    const parseIndices = (notes: string | null | undefined): number[] => {
      const match = notes?.match(/\[indices:([^\]]*)\]/);
      return match && match[1]
        ? match[1].split(',').filter(Boolean).map(Number)
        : [];
    };
    const parseOwnership = (notes: string | null | undefined): Record<number, number> => {
      const match = notes?.match(/\[ownership:([^\]]+)\]/);
      if (!match) return {};
      return Object.fromEntries(
        match[1].split(',').map((pair) => pair.split('=')).filter(([index, userId]) =>
          Number.isInteger(Number(index)) && Number.isInteger(Number(userId)),
        ).map(([index, userId]) => [Number(index), Number(userId)]),
      );
    };

    const existingOwnership = parseOwnership(existingNotes);
    const incomingOwnership = parseOwnership(incomingNotes);
    const currentUserId = Number(currentUser.id);
    const mergedOwnership: Record<number, number> = {};

    Object.entries(existingOwnership).forEach(([index, userId]) => {
      if (Number(userId) !== currentUserId) mergedOwnership[Number(index)] = Number(userId);
    });
    Object.entries(incomingOwnership).forEach(([index, userId]) => {
      mergedOwnership[Number(index)] = Number(userId);
    });

    const incomingIndices = new Set(parseIndices(incomingNotes));
    const currentOwnedIndices = new Set(
      Object.entries(existingOwnership)
        .filter(([, userId]) => Number(userId) === currentUserId)
        .map(([index]) => Number(index)),
    );
    currentOwnedIndices.forEach((index) => {
      if (!incomingIndices.has(index)) delete mergedOwnership[index];
    });

    const mergedIndices = Object.keys(mergedOwnership).map(Number).sort((a, b) => a - b);
    const ownership = Object.entries(mergedOwnership)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([index, userId]) => `${index}=${userId}`)
      .join(',');
    const noteText = incomingNotes.split(' [indices:')[0];
    return `${noteText} [indices:${mergedIndices.join(',')}]${ownership ? `[ownership:${ownership}]` : ''}`;
  }

  async overdueEscalation(): Promise<number> {
    try {
      const qb: SelectQueryBuilder<Task> = this.taskRepo
        .createQueryBuilder("task")
        .where("task.due_date IS NOT NULL")
        .andWhere("task.due_date < CURRENT_DATE")
        .andWhere("task.overdue_email_sent = :sent", { sent: false })
        .andWhere(`task.status NOT IN (:...statuses)`, {
          statuses: [
            TaskStatus.COMPLETED,
            TaskStatus.CLOSED,
            TaskStatus.CANCELLED,
          ],
        });
      const tasks = await qb.getMany();
      for (const t of tasks) {
        const escalationLevel = 1;
        const recipientIds = this.normalizeUserIds([
          ...(Array.isArray(t.assigned_user_ids) ? t.assigned_user_ids : []),
          t.created_by_id,
        ]);

        if (recipientIds.length === 0) {
          this.logger.warn(
            `Overdue task #${t.id} has no assignee or creator to notify`,
          );
          continue;
        }

        const users = await this.userRepo.find({
          where: { id: In(recipientIds) },
          select: ["id", "email", "first_name", "last_name"],
        });

        const emails = [
          ...new Set(
            users
              .map((u) => String(u.email || "").trim().toLowerCase())
              .filter(Boolean),
          ),
        ];

        if (emails.length === 0) {
          this.logger.warn(
            `Overdue task #${t.id}: assignee(s)/creator have no email`,
          );
          continue;
        }

        const nameById = new Map(
          users.map((u) => [
            u.id,
            `${u.first_name || ""} ${u.last_name || ""}`.trim() ||
              String(u.email || "").trim() ||
              `User #${u.id}`,
          ]),
        );
        const assigneeIds = this.normalizeUserIds(
          Array.isArray(t.assigned_user_ids) ? t.assigned_user_ids : [],
        );
        const assignedNames = assigneeIds
          .map((id) => nameById.get(id))
          .filter(Boolean);
        const taskForEmail = {
          ...t,
          assigned_to_display:
            assignedNames.length > 0 ? assignedNames.join(", ") : "Unassigned",
        };

        let anySuccess = false;
        for (const email of emails) {
          const success = await this.emailService.sendTaskOverdueNotification(
            email,
            taskForEmail,
            escalationLevel,
          );
          if (success) anySuccess = true;
        }

        if (anySuccess) {
          t.overdue_email_sent = true;
          await this.taskRepo.save(t);
          await this.logActivity(t, null as any, "overdue_escalated", {
            escalation_level: escalationLevel,
            notified_emails: emails,
            notes:
              "Overdue notification sent to assignee(s) and creator. Duplicate daily emails suppressed.",
          });
        }
      }
      return tasks.length;
    } catch (e) {
      throw e;
    }
  }

  async remove(id: number, currentUser: User): Promise<{ deleted: boolean }> {
    try {
      const task = await this.findOne(id, currentUser);
      const perms = await this.getTaskPermissionsForUser(currentUser);
      this.assertTaskMutationAllowed(task, currentUser, "delete", perms);
      await this.deleteDueRemindersForTask(task.id);
      await this.taskRepo.delete(task.id);
      return { deleted: true };
    } catch (e) {
      throw e;
    }
  }

  private isUserAssignedToTask(task: Task, userId: number): boolean {
    const ids = Array.isArray(task.assigned_user_ids)
      ? task.assigned_user_ids.map((v) => Number(v))
      : [];
    return ids.includes(Number(userId));
  }

  private canManageDueReminders(task: Task, user: User): boolean {
    if (
      user.role === UserRole.SUPER_ADMIN ||
      user.role === UserRole.ADMIN
    ) {
      return true;
    }
    return this.isUserAssignedToTask(task, Number(user.id));
  }

  async deleteDueRemindersForTask(taskId: number): Promise<void> {
    await this.dueReminderRepo.delete({ task_id: taskId });
  }

  async deleteDueRemindersForTaskUser(
    taskId: number,
    userId: number,
  ): Promise<void> {
    await this.dueReminderRepo.delete({ task_id: taskId, user_id: userId });
  }

  async listDueReminders(
    taskId: number,
    currentUser: User,
  ): Promise<TaskDueReminder[]> {
    const task = await this.findOne(taskId, currentUser);
    if (!this.canManageDueReminders(task, currentUser)) {
      throw new ForbiddenException(
        "Only assignees can manage due date reminders for this task",
      );
    }

    const qb = this.dueReminderRepo
      .createQueryBuilder("r")
      .where("r.task_id = :taskId", { taskId })
      .orderBy("r.remind_on_date", "ASC")
      .addOrderBy("r.remind_at_hour", "ASC");

    if (
      currentUser.role !== UserRole.SUPER_ADMIN &&
      currentUser.role !== UserRole.ADMIN
    ) {
      qb.andWhere("r.user_id = :userId", { userId: Number(currentUser.id) });
    }

    return qb.getMany();
  }

  async createDueReminder(
    taskId: number,
    dto: CreateTaskDueReminderDto,
    currentUser: User,
  ): Promise<TaskDueReminder> {
    const task = await this.findOne(taskId, currentUser);
    if (!this.canManageDueReminders(task, currentUser)) {
      throw new ForbiddenException(
        "Only assignees can add due date reminders for this task",
      );
    }
    if (!task.due_date) {
      throw new BadRequestException(
        "Set a due date on this task before adding reminders",
      );
    }

    const remindOnDate = computeRemindOnDate(task.due_date, dto.offset_days);
    if (isReminderSlotInPast(remindOnDate, dto.remind_at_hour)) {
      throw new BadRequestException(
        "Reminder date and time must be in the future (Pakistan time)",
      );
    }

    const reminder = this.dueReminderRepo.create({
      task_id: task.id,
      user_id: Number(currentUser.id),
      offset_days: dto.offset_days,
      remind_on_date: remindOnDate,
      remind_at_hour: dto.remind_at_hour,
      created_by: currentUser,
      updated_by: currentUser,
    });

    try {
      return await this.dueReminderRepo.save(reminder);
    } catch (e: any) {
      if (e?.code === "23505") {
        throw new ConflictException(
          "You already have a reminder at that date and hour for this task",
        );
      }
      throw e;
    }
  }

  async deleteDueReminder(
    taskId: number,
    reminderId: number,
    currentUser: User,
  ): Promise<{ deleted: boolean }> {
    const task = await this.findOne(taskId, currentUser);
    if (!this.canManageDueReminders(task, currentUser)) {
      throw new ForbiddenException(
        "Only assignees can remove due date reminders for this task",
      );
    }

    const reminder = await this.dueReminderRepo.findOne({
      where: { id: reminderId, task_id: taskId },
    });
    if (!reminder) {
      throw new NotFoundException("Reminder not found");
    }

    if (
      currentUser.role !== UserRole.SUPER_ADMIN &&
      currentUser.role !== UserRole.ADMIN &&
      Number(reminder.user_id) !== Number(currentUser.id)
    ) {
      throw new ForbiddenException("You can only delete your own reminders");
    }

    await this.dueReminderRepo.delete(reminder.id);
    return { deleted: true };
  }

  async processDueReminders(): Promise<number> {
    const today = formatDateOnlyPkt(new Date());
    const hour = getPktHour(new Date());

    const reminders = await this.dueReminderRepo
      .createQueryBuilder("r")
      .leftJoinAndSelect("r.task", "task")
      .leftJoinAndSelect("r.user", "user")
      .where("r.remind_on_date = :today", { today })
      .andWhere("r.remind_at_hour = :hour", { hour })
      .getMany();

    const terminalStatuses = [
      TaskStatus.COMPLETED,
      TaskStatus.CLOSED,
      TaskStatus.CANCELLED,
    ];

    for (const reminder of reminders) {
      try {
        const task = reminder.task;
        const user = reminder.user;
        const canEmail =
          task &&
          user?.email &&
          task.due_date &&
          !terminalStatuses.includes(task.status) &&
          this.isUserAssignedToTask(task, user.id);

        if (canEmail) {
          await this.emailService.sendTaskDueReminderEmail(
            user,
            task,
            reminder.offset_days,
            dueDateToPktDateString(task.due_date),
          );
        }
      } catch (e: any) {
        this.logger.warn(
          `Due reminder ${reminder.id} email failed: ${e?.message}`,
        );
      } finally {
        await this.dueReminderRepo.delete(reminder.id);
      }
    }

    return reminders.length;
  }

  async processRecurrence(): Promise<number> {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const recurringTasks = await this.taskRepo
        .createQueryBuilder("task")
        .where("task.task_type = :type", { type: TaskType.RECURRING })
        .andWhere("task.recurrence_next_date IS NOT NULL")
        .andWhere("task.recurrence_next_date <= :today", { today })
        .getMany();

      let createdCount = 0;
      for (const master of recurringTasks) {
        // Check end conditions
        let shouldStop = false;
        if (
          master.recurrence_end_type === RecurrenceEndType.AFTER_OCCURRENCES
        ) {
          if (
            master.recurrence_created_count >= master.recurrence_end_occurrences
          ) {
            shouldStop = true;
          }
        } else if (master.recurrence_end_type === RecurrenceEndType.ON_DATE) {
          if (
            master.recurrence_end_date &&
            master.recurrence_next_date > master.recurrence_end_date
          ) {
            shouldStop = true;
          }
        }

        if (shouldStop) {
          // Optionally mark as no longer recurring or just clear the next date
          master.recurrence_next_date = null;
          await this.taskRepo.save(master);
          continue;
        }

        // Calculate next due date: Next Start + (Original Due - Original Start)
        let childDueDate = null;
        if (
          master.start_date &&
          master.due_date &&
          master.recurrence_next_date
        ) {
          const duration =
            master.due_date.getTime() - master.start_date.getTime();
          childDueDate = new Date(
            master.recurrence_next_date.getTime() + duration,
          );
        }

        // Create the child task
        const child = this.taskRepo.create({
          title: master.title,
          description: master.description,
          department: master.department,
          priority: master.priority,
          workflow_type: master.workflow_type,
          task_type: TaskType.ONE_TIME, // Child is a one-time task
          start_date: master.recurrence_next_date,
          due_date: childDueDate || master.due_date,
          project_id: master.project_id,
          project_name: master.project_name,
          assigned_user_ids: master.assigned_user_ids,
          assigned_users_meta: master.assigned_users_meta,
          reported_by_id: master.reported_by_id,
          created_by_id: master.created_by_id,
          approval_required_user_ids: master.approval_required_user_ids,
          // Reuse the MOV definitions and assignments, but start the new
          // recurrence with a fresh unchecked progress state.
          mov_items: Array.isArray(master.mov_items)
            ? [...master.mov_items]
            : master.mov_items,
          mov_assignments: Array.isArray(master.mov_assignments)
            ? master.mov_assignments.map((item) => ({ ...item }))
            : master.mov_assignments,
          progress: 0,
          last_progress_notes: null,
        });

        await this.taskRepo.save(child);

        // Update master task
        master.recurrence_created_count += 1;
        master.recurrence_next_date = this.getNextOccurrence(
          master.recurrence_next_date,
          master.recurrence_rule,
        );

        // Re-check end condition for the NEW next date
        if (master.recurrence_end_type === RecurrenceEndType.ON_DATE) {
          if (
            master.recurrence_end_date &&
            master.recurrence_next_date > master.recurrence_end_date
          ) {
            master.recurrence_next_date = null;
          }
        } else if (
          master.recurrence_end_type === RecurrenceEndType.AFTER_OCCURRENCES
        ) {
          if (
            master.recurrence_created_count >= master.recurrence_end_occurrences
          ) {
            master.recurrence_next_date = null;
          }
        }

        await this.taskRepo.save(master);
        createdCount++;

        // Send notification to assignees
        if (Array.isArray(master.assigned_user_ids)) {
          const users = await this.userRepo
            .createQueryBuilder("user")
            .where("user.id IN (:...ids)", { ids: master.assigned_user_ids })
            .getMany();
          for (const u of users) {
            await this.createNotification(
              child,
              u,
              TaskNotificationType.ASSIGNED,
            );
            // Also send email
            await this.emailService.sendTaskAssignmentEmail(u, child, master);
          }
        }
      }

      return createdCount;
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      this.logger.error(`Recurrence processing failed: ${errorMessage}`);
      throw e;
    }
  }

  async finalizeRecurringCutoffs(): Promise<number> {
    const now = new Date();
    const karachiParts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Karachi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      hour12: false,
    }).formatToParts(now);
    const parts = Object.fromEntries(
      karachiParts.map((part) => [part.type, part.value]),
    );
    const today = `${parts.year}-${parts.month}-${parts.day}`;
    const cutoffHour = Number(parts.hour);
    if (!Number.isFinite(cutoffHour) || cutoffHour < 12) return 0;

    const tomorrow = new Date(`${today}T00:00:00Z`);
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
    const tomorrowDate = tomorrow.toISOString().slice(0, 10);
    const recurringTasks = await this.taskRepo.find({
      where: { task_type: TaskType.RECURRING },
    });

    let finalized = 0;
    for (const task of recurringTasks) {
      const nextDate = task.recurrence_next_date
        ? new Date(task.recurrence_next_date).toISOString().slice(0, 10)
        : null;
      if (nextDate !== tomorrowDate) continue;
      if (
        [TaskStatus.COMPLETED, TaskStatus.CLOSED, TaskStatus.CANCELLED].includes(
          task.status,
        )
      ) {
        continue;
      }

      const oldStatus = task.status;
      task.status = TaskStatus.COMPLETED;
      if (task.workflow_type === TaskWorkflowType.STANDARD) {
        task.completed_date = task.completed_date ?? now;
      }
      const saved = await this.taskRepo.save(task);
      await this.logActivity(saved, null, "recurrence_cutoff_finalized", {
        from_status: oldStatus,
        cutoff: "12:00 Asia/Karachi",
        next_recurrence_date: nextDate,
      });
      finalized++;
    }
    return finalized;
  }

  private async createNotification(
    task: Task,
    user: User,
    type: TaskNotificationType,
  ) {
    if (!user) return;
    try {
      const n = this.notificationRepo.create({
        task,
        user,
        type,
      });
      await this.notificationRepo.save(n);
    } catch (e) {
      console.error("Failed to create notification", e);
    }
  }

  private async logActivity(
    task: Task,
    user: User | null,
    action: string,
    details: any,
  ) {
    try {
      const basePayload: any = {
        task,
        action,
        details,
        performed_by: user || null,
        created_by: user || null,
        updated_by: user || null,
      };

      if (
        action === "updated" &&
        details &&
        typeof details === "object" &&
        details.changes &&
        typeof details.changes === "object"
      ) {
        const changes = details.changes as any;
        const payload = {
          ...basePayload,
          title: changes.title ?? null,
          description: changes.description ?? null,
          priority: changes.priority ?? null,
          status: changes.status ?? null,
          workflow_type: changes.workflow_type ?? null,
          task_type: changes.task_type ?? null,
          start_date: changes.start_date ? new Date(changes.start_date) : null,
          due_date: changes.due_date ? new Date(changes.due_date) : null,
          project_name: changes.project_name ?? null,
          recurrence_rule: changes.recurrence_rule ?? null,
          recurrence_next_date: changes.recurrence_next_date
            ? new Date(changes.recurrence_next_date)
            : null,
          assigned_user_ids: Array.isArray(changes.assigned_users)
            ? changes.assigned_users
            : null,
          assigned_users_meta: Array.isArray(changes.assigned_users_meta)
            ? changes.assigned_users_meta
            : null,
          progress: changes.progress ?? null,
        };
        const activity = this.activityRepo.create(payload);
        await this.activityRepo.save(activity);
        return;
      }

      const activity = this.activityRepo.create(basePayload);
      await this.activityRepo.save(activity);
    } catch (e) {
      throw e;
    }
  }
}
