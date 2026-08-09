import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, SelectQueryBuilder, Brackets, In, DataSource } from "typeorm";
import {
  CeoNote,
  CeoNoteCategory,
  CeoNoteStatus,
} from "./entities/ceo-note.entity";
import { CeoNoteAudit } from "./entities/ceo-note-audit.entity";
import { Meeting } from "./entities/meeting.entity";
import { Approval } from "./entities/approval.entity";
import { FollowUp } from "./entities/follow-up.entity";
import { WaitingResponse } from "./entities/waiting-response.entity";
import { Visitor } from "./entities/visitor.entity";
import { Call } from "./entities/call.entity";
import { WhatsAppMessage } from "./entities/whatsapp.entity";
import { ProjectCommandSheet } from "./entities/project-command-sheet.entity";
import { CreateCeoNoteDto } from "./dto/create-ceo-note.dto";
import { UpdateCeoNoteDto } from "./dto/update-ceo-note.dto";
import { ApproveNoteDto } from "./dto/approve-note.dto";
import { ConvertToTaskDto } from "./dto/convert-to-task.dto";
import { BulkApproveDto } from "./dto/bulk-approve.dto";
import { BulkConvertToTaskDto } from "./dto/bulk-convert-to-task.dto";
import { CeoNotesQueryDto } from "./dto/ceo-notes-query.dto";
import { User } from "../users/user.entity";
import { TasksService } from "../tasks/tasks.service";
import { CreateTaskDto } from "../tasks/dto/create-task.dto";
import {
  Task,
  TaskStatus,
  TaskPriority,
  TaskWorkflowType,
  TaskType,
} from "../tasks/entities/task.entity";
import { applyCommonFilters } from "../utils/filters/common-filter.util";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationType } from "../notifications/entities/notification.entity";
import { CeoNoteAuditService } from "./ceo-note-audit.service";
import { CeoNoteCategoryService } from "./ceo-note-category.service";
import { CeoNoteApprovalService } from "./ceo-note-approval.service";
import { CeoNoteConversionService } from "./ceo-note-conversion.service";
import { CeoNoteDashboardService } from "./ceo-note-dashboard.service";
import { CeoNoteReportService, ReportType } from "./ceo-note-report.service";

@Injectable()
export class CeoNotesService {
  private readonly logger = new Logger(CeoNotesService.name);
  private readonly searchableColumns = ["title", "details", "related_person"];

  constructor(
    @InjectRepository(CeoNote)
    private readonly ceoNoteRepository: Repository<CeoNote>,
    @InjectRepository(CeoNoteAudit)
    private readonly ceoNoteAuditRepository: Repository<CeoNoteAudit>,
    @InjectRepository(Meeting)
    private readonly meetingRepository: Repository<Meeting>,
    @InjectRepository(Approval)
    private readonly approvalRepository: Repository<Approval>,
    @InjectRepository(FollowUp)
    private readonly followUpRepository: Repository<FollowUp>,
    @InjectRepository(WaitingResponse)
    private readonly waitingResponseRepository: Repository<WaitingResponse>,
    @InjectRepository(Visitor)
    private readonly visitorRepository: Repository<Visitor>,
    @InjectRepository(Call)
    private readonly callRepository: Repository<Call>,
    @InjectRepository(WhatsAppMessage)
    private readonly whatsappRepository: Repository<WhatsAppMessage>,
    @InjectRepository(ProjectCommandSheet)
    private readonly pcsRepository: Repository<ProjectCommandSheet>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly tasksService: TasksService,
    private readonly notificationsService: NotificationsService,
    private readonly dataSource: DataSource,
    private readonly auditService: CeoNoteAuditService,
    private readonly categoryService: CeoNoteCategoryService,
    private readonly approvalService: CeoNoteApprovalService,
    private readonly conversionService: CeoNoteConversionService,
    private readonly dashboardService: CeoNoteDashboardService,
    private readonly reportService: CeoNoteReportService,
  ) {}

  private async logAudit(
    note: CeoNote,
    user: User,
    action: string,
    oldValue?: any,
    newValue?: any,
  ) {
    const audit = this.ceoNoteAuditRepository.create({
      note_id: note.id,
      user_id: user?.id || null,
      action,
      old_value: oldValue || null,
      new_value: newValue || null,
    });
    await this.ceoNoteAuditRepository.save(audit);
  }

  private safelyParseDate(dateString?: string): Date | undefined {
    if (!dateString || dateString.trim() === "") {
      return undefined;
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return undefined;
    }
    return date;
  }

  private readonly emailApprovalAllowedStatuses = [
    CeoNoteStatus.WAITING_RESPONSE,
    CeoNoteStatus.PENDING,
    CeoNoteStatus.APPROVED,
    CeoNoteStatus.REJECTED,
    CeoNoteStatus.COMPLETED,
    CeoNoteStatus.CLOSED,
    CeoNoteStatus.CANCELLED,
    "request_clarification" as CeoNoteStatus,
  ];

  private readonly emailApprovalAllowedStatusesNormalized = new Set(
    this.emailApprovalAllowedStatuses.map((s) => this.normalizeStatusKey(s as string)),
  );
  private readonly ceoNoteStatusValuesNormalized = new Set(
    Object.values(CeoNoteStatus).map((s) => this.normalizeStatusKey(s)),
  );

  private normalizeStatusKey(key?: string): string {
    if (!key) return "";
    return key
      .toString()
      .trim()
      .toLowerCase()
      .replace(/[\s\-]+/g, "_");
  }

  private normalizeStatusForCategory(
    category?: CeoNoteCategory,
    status?: string,
  ): CeoNoteStatus | undefined {
    const key = this.normalizeStatusKey(status);
    if (!key) {
      if (category === CeoNoteCategory.EMAILS_AND_APPROVALS) return CeoNoteStatus.WAITING_RESPONSE;
      if (category === CeoNoteCategory.WAITING_RESPONSE) return CeoNoteStatus.WAITING_RESPONSE;
      if (category === CeoNoteCategory.PROJECT_COMMAND_SHEETS) return CeoNoteStatus.PENDING;
      if (category === CeoNoteCategory.VISITORS) return CeoNoteStatus.PENDING;
      if (category === CeoNoteCategory.CALLS) return CeoNoteStatus.PENDING;
      if (category === CeoNoteCategory.WHATSAPP) return CeoNoteStatus.PENDING;
      if (category === CeoNoteCategory.MEETINGS) return CeoNoteStatus.PENDING;
      return status as CeoNoteStatus;
    }

    if (category === CeoNoteCategory.EMAILS_AND_APPROVALS) {
      if (key === "request_clarification" || key === "clarification_requested") {
        return CeoNoteStatus.PENDING;
      }
      if (this.emailApprovalAllowedStatusesNormalized.has(key)) {
        const match = this.emailApprovalAllowedStatuses.find(
          (s) => this.normalizeStatusKey(s as string) === key,
        );
        if (match) return match as CeoNoteStatus;
      }
      return CeoNoteStatus.WAITING_RESPONSE;
    }

    if (category === CeoNoteCategory.WAITING_RESPONSE) {
      if (key === "reminder_sent" || key === "received") {
        return CeoNoteStatus.WAITING_RESPONSE;
      }
      if (key === "closed") {
        return CeoNoteStatus.CLOSED;
      }
      return CeoNoteStatus.WAITING_RESPONSE;
    }

    if (category === CeoNoteCategory.PROJECT_COMMAND_SHEETS) {
      if (key === "on_hold") {
        return CeoNoteStatus.PENDING;
      }
      if (this.ceoNoteStatusValuesNormalized.has(key)) {
        const match = Object.values(CeoNoteStatus).find(
          (s) => this.normalizeStatusKey(s) === key,
        );
        if (match) return match;
      }
      return CeoNoteStatus.PENDING;
    }

    if (category === CeoNoteCategory.VISITORS) {
      if (key === "waiting") {
        return CeoNoteStatus.PENDING;
      }
      if (key === "cancelled" || key === "canceled") {
        return CeoNoteStatus.CANCELLED;
      }
      if (key === "completed") {
        return CeoNoteStatus.COMPLETED;
      }
      if (key === "closed") {
        return CeoNoteStatus.CLOSED;
      }
      return CeoNoteStatus.PENDING;
    }

    if (category === CeoNoteCategory.CALLS) {
      if (key === "follow_up_required" || key === "followup_required") {
        return CeoNoteStatus.PENDING;
      }
      if (key === "cancelled" || key === "canceled") {
        return CeoNoteStatus.CANCELLED;
      }
      if (key === "completed") {
        return CeoNoteStatus.COMPLETED;
      }
      if (key === "closed") {
        return CeoNoteStatus.CLOSED;
      }
      return CeoNoteStatus.PENDING;
    }

    if (category === CeoNoteCategory.WHATSAPP) {
      if (key === "pending_reply" || key === "pendingreply") {
        return CeoNoteStatus.PENDING;
      }
      if (key === "replied") {
        return CeoNoteStatus.COMPLETED;
      }
      if (key === "waiting_response") {
        return CeoNoteStatus.WAITING_RESPONSE;
      }
      if (key === "closed") {
        return CeoNoteStatus.CLOSED;
      }
      if (key === "cancelled" || key === "canceled") {
        return CeoNoteStatus.CANCELLED;
      }
      if (key === "completed") {
        return CeoNoteStatus.COMPLETED;
      }
      return CeoNoteStatus.PENDING;
    }

    if (category === CeoNoteCategory.MEETINGS) {
      if (this.ceoNoteStatusValuesNormalized.has(key)) {
        const match = Object.values(CeoNoteStatus).find(
          (s) => this.normalizeStatusKey(s) === key,
        );
        if (match) return match;
      }
      return CeoNoteStatus.PENDING;
    }

    if (this.ceoNoteStatusValuesNormalized.has(key)) {
      const match = Object.values(CeoNoteStatus).find(
        (s) => this.normalizeStatusKey(s) === key,
      );
      if (match) return match;
    }

    return status as CeoNoteStatus;
  }

  private async setAssignedUsers(note: CeoNote, assignedUserIds?: (string | number)[]) {
    const numericUserIds = assignedUserIds?.map((id) => Number(id)).filter((id) => !isNaN(id)) || [];

    if (numericUserIds.length === 0) {
      note.assigned_users = [];
      note.assigned_user_ids = [];
      return;
    }

    const users = await this.userRepository.findBy({ id: In(numericUserIds) });
    note.assigned_users = users;
    note.assigned_user_ids = users.map((user) => user.id);
  }

  async create(createCeoNoteDto: CreateCeoNoteDto, currentUser: User) {
    return this.dataSource.transaction(async (manager) => {
      const noteData: Partial<CeoNote> = {
        ...createCeoNoteDto,
        created_by_id: currentUser?.id || null,
        date: this.safelyParseDate(createCeoNoteDto.date) || new Date(),
        due_date: this.safelyParseDate(createCeoNoteDto.due_date),
        status: this.normalizeStatusForCategory(
          createCeoNoteDto.category,
          createCeoNoteDto.status,
        ),
      };

      const note = this.ceoNoteRepository.create(noteData);
      await this.setAssignedUsers(note, createCeoNoteDto.assigned_user_ids);
      const savedNote = await manager.getRepository(CeoNote).save(note);

      await this.auditService.log(savedNote, currentUser, "created", null, savedNote, manager);
      // Ensure category records receive the normalized (authoritative) status
      const createDtoWithStatus = { ...createCeoNoteDto, status: noteData.status };
      await this.categoryService.createCategoryRecord(manager, savedNote, createDtoWithStatus);
      await manager.getRepository(CeoNote).save(savedNote);

      if (savedNote.assigned_user_ids && savedNote.assigned_user_ids.length > 0) {
        const userIdsToNotify = savedNote.assigned_user_ids.filter(
          (id) => id !== currentUser?.id,
        );
        if (userIdsToNotify.length > 0) {
          await this.notificationsService.create(
            {
              title: "CEO Note Assigned to You",
              message: `A new CEO note "${savedNote.title}" has been assigned to you.`,
              type: NotificationType.INFO,
              link: `/ceo-office/notes/${savedNote.id}`,
              metadata: { noteId: savedNote.id },
            },
            userIdsToNotify,
            currentUser,
          );
        }
      }

      // Fetch the saved note using the transaction manager so we see uncommitted changes
      const created = await manager.getRepository(CeoNote).findOne({
        where: { id: savedNote.id },
        relations: [
          "created_by",
          "related_task",
          "assigned_users",
          "meeting_detail",
          "approval_detail",
          "follow_up_detail",
          "waiting_response_detail",
          "project_command_sheet_detail",
          "visitor_detail",
          "call_detail",
          "whatsapp_detail",
        ],
      });
      return created;
    });
  }

  async findAll(payload: any, currentUser?: User) {
    try {
      const page = +(payload?.pagination?.page || payload?.page || 1);
      const pageSize = +(
        payload?.pagination?.pageSize ||
        payload?.pageSize ||
        10
      );
      const sortField = payload?.sortField || "created_at";
      const sortOrder = payload?.sortOrder || "DESC";

      const qb = this.ceoNoteRepository.createQueryBuilder("note")
        .leftJoinAndSelect("note.assigned_users", "assigned_users")
        .leftJoinAndSelect("note.meeting_detail", "meeting_detail")
        .leftJoinAndSelect("note.approval_detail", "approval_detail")
        .leftJoinAndSelect("note.follow_up_detail", "follow_up_detail")
        .leftJoinAndSelect("note.waiting_response_detail", "waiting_response_detail")
        .leftJoinAndSelect("note.project_command_sheet_detail", "project_command_sheet_detail")
        .leftJoinAndSelect("note.visitor_detail", "visitor_detail")
        .leftJoinAndSelect("note.call_detail", "call_detail")
        .leftJoinAndSelect("note.whatsapp_detail", "whatsapp_detail");

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

      const startDate = safeFilters.start_date;
      const endDate = safeFilters.end_date;
      delete safeFilters.start_date;
      delete safeFilters.end_date;

      if (startDate) {
        qb.andWhere("note.date >= :start_date", { start_date: startDate });
      }
      if (endDate) {
        qb.andWhere("note.date <= :end_date", { end_date: endDate });
      }

      const searchTerm = safeFilters.search;
      if (searchTerm && searchTerm.trim() !== "") {
        qb.andWhere(
          new Brackets((searchQb) => {
            searchQb.where("LOWER(note.title) LIKE :searchTerm", {
              searchTerm: `%${searchTerm.toLowerCase()}%`,
            });
            searchQb.orWhere("LOWER(note.details) LIKE :searchTerm", {
              searchTerm: `%${searchTerm.toLowerCase()}%`,
            });
            searchQb.orWhere("LOWER(note.related_person) LIKE :searchTerm", {
              searchTerm: `%${searchTerm.toLowerCase()}%`,
            });
          }),
        );
        delete safeFilters.search;
      }

      applyCommonFilters(qb, safeFilters, this.searchableColumns, "note");

      const validSort = [
        "date",
        "title",
        "priority",
        "status",
        "category",
        "due_date",
        "created_at",
        "updated_at",
      ];
      const sortName = validSort.includes(sortField) ? sortField : "created_at";
      qb.orderBy(`note.${sortName}`, sortOrder as "ASC" | "DESC");

      const skip = (page - 1) * pageSize;
      if (pageSize !== -1) {
        qb.skip(skip).take(pageSize);
      }

      const [data, total] = await qb.getManyAndCount();


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
      };
    } catch (e) {
      throw e;
    }
  }

  async findOne(id: number) {
    const note = await this.ceoNoteRepository.findOne({
      where: { id },
      relations: ["created_by", "related_task", "assigned_users", "meeting_detail", "approval_detail", "follow_up_detail", "waiting_response_detail", "project_command_sheet_detail", "visitor_detail", "call_detail", "whatsapp_detail"],
    });
    if (!note) {
      throw new NotFoundException(`Note with ID ${id} not found`);
    }
    return note;
  }

  async update(
    id: number,
    updateCeoNoteDto: UpdateCeoNoteDto,
    currentUser: User,
  ) {
    return this.dataSource.transaction(async (manager) => {
      const note = await this.findOne(id);
      const oldValue = { ...note };
      const oldAssignedUserIds = [...(note.assigned_user_ids || [])];

      // Filter out null/undefined to avoid overwriting existing values
      const filteredDto = Object.fromEntries(
        Object.entries(updateCeoNoteDto).filter(([, v]) => v !== null && v !== undefined),
      );
      const finalCategory = filteredDto.category ?? note.category;

      if (
        finalCategory === CeoNoteCategory.EMAILS_AND_APPROVALS &&
        filteredDto.status !== undefined &&
        !this.emailApprovalAllowedStatuses.includes(filteredDto.status as CeoNoteStatus)
      ) {
        throw new Error(
          `Invalid status for Emails & Approvals category: ${filteredDto.status}`,
        );
      }

      Object.assign(note, filteredDto);
      if (filteredDto.status !== undefined) {
        note.status = this.normalizeStatusForCategory(
          finalCategory,
          filteredDto.status as CeoNoteStatus,
        );
      } else if (
        filteredDto.category === CeoNoteCategory.EMAILS_AND_APPROVALS &&
        note.category !== CeoNoteCategory.EMAILS_AND_APPROVALS
      ) {
        note.status = CeoNoteStatus.WAITING_RESPONSE;
      }
      if (updateCeoNoteDto.assigned_user_ids !== undefined) {
        await this.setAssignedUsers(note, updateCeoNoteDto.assigned_user_ids);
      }
      if (updateCeoNoteDto.date !== undefined) {
        const parsedDate = this.safelyParseDate(updateCeoNoteDto.date);
        if (parsedDate) note.date = parsedDate;
      }
      if (updateCeoNoteDto.due_date !== undefined) {
        note.due_date = this.safelyParseDate(updateCeoNoteDto.due_date);
      }
      const updatedNote = await manager.getRepository(CeoNote).save(note);
      await this.auditService.log(
        updatedNote,
        currentUser,
        "updated",
        oldValue,
        updatedNote,
        manager,
      );

      // Log status change specifically
      if (oldValue.status !== updatedNote.status) {
        await this.auditService.log(
          updatedNote,
          currentUser,
          "status_changed",
          { status: oldValue.status },
          { status: updatedNote.status },
          manager,
        );
      }

      // Log assignment changes specifically
      const newAssignedIds = updatedNote.assigned_user_ids || [];
      const addedIds = newAssignedIds.filter((id) => !oldAssignedUserIds.includes(id));
      const removedIds = oldAssignedUserIds.filter((id) => !newAssignedIds.includes(id));
      if (addedIds.length > 0 || removedIds.length > 0) {
        await this.auditService.log(
          updatedNote,
          currentUser,
          "assignment_changed",
          { assigned_user_ids: oldAssignedUserIds },
          { assigned_user_ids: newAssignedIds, added: addedIds, removed: removedIds },
          manager,
        );
      }

      // Ensure category update uses the authoritative, normalized note status
      const updateDtoWithStatus = { ...updateCeoNoteDto, status: updatedNote.status };
      await this.categoryService.updateCategoryRecord(manager, updatedNote, updateDtoWithStatus);
      await manager.getRepository(CeoNote).save(updatedNote);

      const newAssignedUserIds = updatedNote.assigned_user_ids || [];
      const addedUserIds = newAssignedUserIds.filter(
        (id) => !oldAssignedUserIds.includes(id) && id !== currentUser?.id,
      );
      if (addedUserIds.length > 0) {
        await this.notificationsService.create(
          {
            title: "CEO Note Assigned to You",
            message: `CEO note "${updatedNote.title}" has been assigned to you.`,
            type: NotificationType.INFO,
            link: `/ceo-office/notes/${updatedNote.id}`,
            metadata: { noteId: updatedNote.id },
          },
          addedUserIds,
          currentUser,
        );
      }

      return this.findOne(updatedNote.id);
    });
  }

  async remove(id: number, currentUser: User) {
    return this.dataSource.transaction(async (manager) => {
      const note = await this.findOne(id);
      await this.auditService.log(note, currentUser, "deleted", note, null, manager);

      // Note: all category OneToOne relations (meeting/approval/followUp/waitingResponse/
      // project_command_sheet/visitor/call/whatsapp) are owned by the CATEGORY entity via
      // note_id (or related_note_id) with @JoinColumn + onDelete: CASCADE.
      // We always explicitly delete category rows first below for consistency, and the
      // FK cascade is a safety net. We do NOT touch relation() on CeoNote (the inverse
      // side) because it does not own the FK column.
      await this.categoryService.deleteCategoryRecord(manager, note);
      await manager.getRepository(CeoNote).remove(note);
      return { message: "Note deleted successfully" };
    });
  }

  async approve(id: number, approveNoteDto: ApproveNoteDto, currentUser: User) {
    const note = await this.findOne(id);
    return this.dataSource.transaction(async (manager) => {
      const updatedNote = await this.approvalService.approve(
        manager,
        note,
        {
          decision: approveNoteDto.decision,
          remarks: approveNoteDto.remarks,
        },
        currentUser,
      );

      // Ensure category-specific record reflects the authoritative note status
      const updateDtoWithStatus = { status: updatedNote.status };
      await this.categoryService.updateCategoryRecord(manager, updatedNote, updateDtoWithStatus);

      return this.findOne(updatedNote.id);
    });
  }

  async bulkApprove(bulkApproveDto: BulkApproveDto, currentUser: User) {
    return this.dataSource.transaction(async (manager) => {
      return this.approvalService.bulkApprove(
        manager,
        bulkApproveDto.note_ids,
        {
          decision: bulkApproveDto.decision,
          remarks: bulkApproveDto.remarks,
        },
        currentUser,
      );
    });
  }

  async getInstructionRegister(query: CeoNotesQueryDto) {
    return this.dashboardService.getInstructionRegister(query);
  }

  async bulkConvertToTask(
    bulkConvertToTaskDto: BulkConvertToTaskDto,
    currentUser: User,
  ) {
    const results = [] as Array<{ noteId: number; taskId?: number; error?: string }>;
    return this.dataSource.transaction(async (manager) => {
      for (const noteId of bulkConvertToTaskDto.note_ids) {
        try {
          const note = await manager.getRepository(CeoNote).findOne({ where: { id: noteId } });
          if (!note) {
            results.push({ noteId, error: "Note not found" });
            continue;
          }
          const conversionResult = await this.conversionService.convertToTask(
            manager,
            note,
            bulkConvertToTaskDto,
            currentUser,
          );
          results.push({ noteId, taskId: conversionResult.task.id });
        } catch (error) {
          const msg = error instanceof Error ? error.message : String(error ?? "");
          results.push({ noteId, error: msg || "Conversion failed" });
        }
      }
      return results;
    });
  }

  async convertToTask(
    id: number,
    convertToTaskDto: ConvertToTaskDto,
    currentUser: User,
  ) {
    const note = await this.findOne(id);
    return this.dataSource.transaction(async (manager) => {
      const result = await this.conversionService.convertToTask(
        manager,
        note,
        convertToTaskDto,
        currentUser,
      );

      // Sync category record to the note's updated status
      const updateDtoWithStatus = { status: result.note.status };
      await this.categoryService.updateCategoryRecord(manager, result.note, updateDtoWithStatus);

      return {
        note: await this.findOne(result.note.id),
        task: result.task,
      };
    });
  }

  private mapPriority(priority: string): TaskPriority {
    switch (priority) {
      case "low":
        return TaskPriority.LOW;
      case "medium":
        return TaskPriority.MEDIUM;
      case "high":
        return TaskPriority.HIGH;
      case "critical":
        return TaskPriority.CRITICAL;
      default:
        return TaskPriority.MEDIUM;
    }
  }

  async getDashboardStats(currentUser?: User, category?: string) {
    const qb = this.ceoNoteRepository.createQueryBuilder("note");

    if (category) {
      qb.andWhere("note.category = :category", { category });
    }

    const getNotesForCategory = async (cat: CeoNoteCategory) => {
      if (category && category !== cat) {
        return [];
      }
      const categoryQb = this.ceoNoteRepository.createQueryBuilder("note")
        .leftJoinAndSelect("note.assigned_users", "assigned_users")
        .leftJoinAndSelect("note.meeting_detail", "meeting_detail")
        .leftJoinAndSelect("note.approval_detail", "approval_detail")
        .leftJoinAndSelect("note.follow_up_detail", "follow_up_detail")
        .leftJoinAndSelect("note.waiting_response_detail", "waiting_response_detail")
        .leftJoinAndSelect("note.project_command_sheet_detail", "project_command_sheet_detail")
        .leftJoinAndSelect("note.visitor_detail", "visitor_detail")
        .leftJoinAndSelect("note.call_detail", "call_detail")
        .leftJoinAndSelect("note.whatsapp_detail", "whatsapp_detail");
      categoryQb.andWhere("note.category = :cat", { cat });
      return await categoryQb
        .limit(10)
        .orderBy("note.created_at", "DESC")
        .getMany();
    };

    const totalNotes = await qb.getCount();
    const unprocessedNotes = await qb
      .clone()
      .andWhere("note.status = :status", { status: CeoNoteStatus.UNPROCESSED })
      .getCount();
    const pendingApprovalsQb = this.ceoNoteRepository.createQueryBuilder("note");
    const pendingApprovals = await pendingApprovalsQb
      .andWhere("note.category = :category", { category: CeoNoteCategory.EMAILS_AND_APPROVALS })
      .andWhere("note.status = :status", { status: CeoNoteStatus.PENDING })
      .getCount();
    const waitingResponses = await qb
      .clone()
      .andWhere("note.status = :status", {
        status: CeoNoteStatus.WAITING_RESPONSE,
      })
      .getCount();

    const overdueQb = qb
      .clone()
      .andWhere("note.due_date < CURRENT_DATE")
      .andWhere("note.status NOT IN (:...completed)", {
        completed: [
          CeoNoteStatus.COMPLETED,
          CeoNoteStatus.CLOSED,
          CeoNoteStatus.CANCELLED,
          CeoNoteStatus.APPROVED,
        ],
      });
    const overdueFollowUps = await overdueQb.getCount();

    const topPriorityNotes = await getNotesForCategory(
      CeoNoteCategory.TOP_PRIORITY,
    );
    const todayTasks = await getNotesForCategory(CeoNoteCategory.TODAY_TASK);
    const followUps = await getNotesForCategory(CeoNoteCategory.FOLLOW_UP);
    const callNotes = await getNotesForCategory(CeoNoteCategory.CALLS);
    const whatsappNotes = await getNotesForCategory(CeoNoteCategory.WHATSAPP);
    const ceoNoteVisitors = await getNotesForCategory(CeoNoteCategory.VISITORS);
    const meetings = await getNotesForCategory(CeoNoteCategory.MEETINGS);
    const ceoDirectOrders = await getNotesForCategory(
      CeoNoteCategory.CEO_DIRECT_ORDERS,
    );
    const importantDecisions = await getNotesForCategory(
      CeoNoteCategory.IMPORTANT_DECISIONS,
    );
    const emailsAndApprovals = await getNotesForCategory(
      CeoNoteCategory.EMAILS_AND_APPROVALS,
    );
    const waitingResponseNotes = await getNotesForCategory(
      CeoNoteCategory.WAITING_RESPONSE,
    );
    const projectNotes = await getNotesForCategory(
      CeoNoteCategory.PROJECT_NOTES,
    );
    const completedNotes = await getNotesForCategory(CeoNoteCategory.COMPLETED);

    const recentVisitors = await this.visitorRepository.find({
      take: 10,
      order: { visit_datetime: "DESC" },
    });
    const recentCalls = await this.callRepository.find({
      take: 10,
      order: { visit_datetime: "DESC" },
    });
    const recentWhatsapps = await this.whatsappRepository.find({
      take: 10,
      order: { visit_datetime: "DESC" },
    });
    const visitorsResult = {
      data: await this.visitorRepository.find({
        take: 10,
        order: { visit_datetime: "DESC" },
        relations: ["related_note"],
      }),
      total: await this.visitorRepository.count(),
      page: 1,
      pageSize: 10,
      totalPages: 1,
    };
    const projectSheetsResult = {
      data: await this.pcsRepository.find({
        take: 10,
        order: { created_at: "DESC" },
      }),
      total: await this.pcsRepository.count(),
      page: 1,
      pageSize: 10,
      totalPages: 1,
    };

    const getCombinedList = (notes: any[], records: any[], noteCategory: string, recordType: string) => {
      const noteIds = new Set(notes.map(n => n.id));
      const filteredRecords = records.filter(r => !r.related_note_id || !noteIds.has(r.related_note_id));

      const processedNotes = notes.map(note => ({
        ...note,
        source: "ceo-note",
        title: note.title,
        caller_name: note.related_person,
        contact_name: note.related_person,
        visitor_name: note.related_person,
      }));

      const processedRecords = filteredRecords.map(record => ({
        ...record,
        source: "visitor-record",
        type: recordType,
        status: record.status || "Pending"
      }));

      const combined = [...processedNotes, ...processedRecords];
      combined.sort((a, b) => {
        const dateA = new Date(a.date || a.visit_datetime);
        const dateB = new Date(b.date || b.visit_datetime);
        return dateB.getTime() - dateA.getTime();
      });

      return combined.slice(0, 10);
    };

    const categoryBreakdown = await qb
      .select("note.category", "category")
      .addSelect("COUNT(note.id)", "count")
      .groupBy("note.category")
      .getRawMany();

    const statusBreakdown = await qb
      .select("note.status", "status")
      .addSelect("COUNT(note.id)", "count")
      .groupBy("note.status")
      .getRawMany();

    return {
      summary: {
        total_notes: totalNotes,
        unprocessed_notes: unprocessedNotes,
        pending_approvals: pendingApprovals,
        overdue_follow_ups: overdueFollowUps,
        waiting_responses: waitingResponses,
        total_visitors: visitorsResult.total,
        total_project_sheets: projectSheetsResult.total,
      },
      top_priority_notes: topPriorityNotes,
      today_tasks: todayTasks,
      follow_ups: followUps,
      calls: getCombinedList(callNotes, recentCalls, "calls", "call"),
      whatsapp: getCombinedList(whatsappNotes, recentWhatsapps, "whatsapp", "whatsapp"),
      visitors: getCombinedList(ceoNoteVisitors, recentVisitors, "visitors", "visitor"),
      meetings,
      ceo_direct_orders: ceoDirectOrders,
      important_decisions: importantDecisions,
      emails_and_approvals: emailsAndApprovals,
      waiting_response_notes: waitingResponseNotes,
      project_notes: projectNotes,
      project_command_sheets: projectSheetsResult.data,
      completed_notes: completedNotes,
      category_breakdown: categoryBreakdown,
      status_breakdown: statusBreakdown,
    };
  }

  async getAuditHistory(id: number) {
    const audits = await this.ceoNoteAuditRepository.find({
      where: { note_id: id },
      relations: ["user"],
      order: { created_at: "DESC" },
    });
    return audits;
  }

  async generateReport(type: ReportType, startDate?: string, endDate?: string) {
    return this.reportService.generateReport(type, startDate, endDate);
  }
}
