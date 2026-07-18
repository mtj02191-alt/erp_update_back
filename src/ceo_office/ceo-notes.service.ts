import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, SelectQueryBuilder, Brackets, In } from "typeorm";
import {
  CeoNote,
  CeoNoteCategory,
  CeoNoteStatus,
} from "./entities/ceo-note.entity";
import { CeoNoteAudit } from "./entities/ceo-note-audit.entity";
import { Visitor } from "./entities/visitor.entity";
import { Call } from "./entities/call.entity";
import { WhatsAppMessage } from "./entities/whatsapp.entity";
import { CreateCeoNoteDto } from "./dto/create-ceo-note.dto";
import { UpdateCeoNoteDto } from "./dto/update-ceo-note.dto";
import { ApproveNoteDto } from "./dto/approve-note.dto";
import { ConvertToTaskDto } from "./dto/convert-to-task.dto";
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
import { VisitorsService } from "./visitors.service";
import { ProjectCommandSheetsService } from "./project-command-sheets.service";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationType } from "../notifications/entities/notification.entity";

@Injectable()
export class CeoNotesService {
  private readonly logger = new Logger(CeoNotesService.name);
  private readonly searchableColumns = ["title", "details", "related_person"];

  constructor(
    @InjectRepository(CeoNote)
    private readonly ceoNoteRepository: Repository<CeoNote>,
    @InjectRepository(CeoNoteAudit)
    private readonly ceoNoteAuditRepository: Repository<CeoNoteAudit>,
    @InjectRepository(Visitor)
    private readonly visitorRepository: Repository<Visitor>,
    @InjectRepository(Call)
    private readonly callRepository: Repository<Call>,
    @InjectRepository(WhatsAppMessage)
    private readonly whatsappRepository: Repository<WhatsAppMessage>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly tasksService: TasksService,
    private readonly visitorsService: VisitorsService,
    private readonly projectCommandSheetsService: ProjectCommandSheetsService,
    private readonly notificationsService: NotificationsService,
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
    if (!dateString || dateString.trim() === '') {
      return undefined;
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return undefined;
    }
    return date;
  }

  private async setAssignedUsers(note: CeoNote, assignedUserIds?: (string | number)[]) {
    console.log('=== setAssignedUsers ===');
    console.log('assignedUserIds:', assignedUserIds);
    
    // Convert all user IDs to numbers
    const numericUserIds = assignedUserIds?.map(id => Number(id)).filter(id => !isNaN(id)) || [];
    
    if (numericUserIds.length === 0) {
      note.assigned_users = [];
      note.assigned_user_ids = [];
      console.log('No valid assignedUserIds, setting to empty arrays');
      return;
    }
    
    // Fetch users with those ids
    console.log('Fetching users by ids:', numericUserIds);
    const users = await this.userRepository.findBy({ id: In(numericUserIds) });
    console.log('Found users:', users);
    
    note.assigned_users = users;
    note.assigned_user_ids = users.map(user => user.id);
    console.log('Set note.assigned_users:', note.assigned_users);
    console.log('Set note.assigned_user_ids:', note.assigned_user_ids);
  }

  async create(createCeoNoteDto: CreateCeoNoteDto, currentUser: User) {

    const noteData: Partial<CeoNote> = {
      ...createCeoNoteDto,
      created_by_id: currentUser?.id || null,
      date: this.safelyParseDate(createCeoNoteDto.date) || new Date(),
      due_date: this.safelyParseDate(createCeoNoteDto.due_date),
      follow_up_requested_date: this.safelyParseDate(createCeoNoteDto.follow_up_requested_date),
      follow_up_last_date: this.safelyParseDate(createCeoNoteDto.follow_up_last_date),
      follow_up_next_date: this.safelyParseDate(createCeoNoteDto.follow_up_next_date),
      meeting_date: this.safelyParseDate(createCeoNoteDto.meeting_date),
      waiting_response_request_date: this.safelyParseDate(createCeoNoteDto.waiting_response_request_date),
      waiting_response_expected_date: this.safelyParseDate(createCeoNoteDto.waiting_response_expected_date),
      waiting_response_last_reminder_date: this.safelyParseDate(createCeoNoteDto.waiting_response_last_reminder_date),
    };
    const note = this.ceoNoteRepository.create(noteData);
    // Set assigned users
    await this.setAssignedUsers(note, createCeoNoteDto.assigned_user_ids);
    const savedNote = await this.ceoNoteRepository.save(note);
    await this.logAudit(savedNote, currentUser, "created", null, savedNote);

    // Create corresponding Visitor/Call/WhatsApp only if category is visitors/calls/whatsapp and no linked record already exists
    if ([CeoNoteCategory.VISITORS, CeoNoteCategory.CALLS, CeoNoteCategory.WHATSAPP].includes(savedNote.category)) {
      let linkedRecordExists = false;
      // Check for existing linked record
      if (savedNote.category === CeoNoteCategory.VISITORS) {
        linkedRecordExists = await this.visitorRepository.count({ where: { related_note_id: savedNote.id } }) > 0;
      } else if (savedNote.category === CeoNoteCategory.CALLS) {
        linkedRecordExists = await this.callRepository.count({ where: { related_note_id: savedNote.id } }) > 0;
      } else if (savedNote.category === CeoNoteCategory.WHATSAPP) {
        linkedRecordExists = await this.whatsappRepository.count({ where: { related_note_id: savedNote.id } }) > 0;
      }
      
      if (!linkedRecordExists) {
        // Only create the corresponding record if none exists yet
        if (savedNote.category === CeoNoteCategory.VISITORS) {
          const visitor = this.visitorRepository.create({
            type: "visitor",
            visitor_name: savedNote.related_person || "",
            organization: "",
            purpose: savedNote.details || "",
            meeting_with: "",
            department: savedNote.department || null,
            protocol_required: "",
            expected_duration: "",
            visitor_outcome: "",
            visit_datetime: savedNote.date || new Date(),
            related_note_id: savedNote.id,
            status: "Pending",
            created_by_id: currentUser?.id || null,
          });
          await this.visitorRepository.save(visitor);
        } else if (savedNote.category === CeoNoteCategory.CALLS) {
          const call = this.callRepository.create({
            type: "call",
            caller_name: savedNote.related_person || "",
            organization: "",
            phone_number: "",
            call_purpose: savedNote.details || "",
            call_summary: "",
            follow_up_required: "No",
            follow_up_date: savedNote.due_date || null,
            visit_datetime: savedNote.date || new Date(),
            related_note_id: savedNote.id,
            status: "Pending",
            created_by_id: currentUser?.id || null,
          });
          await this.callRepository.save(call);
        } else if (savedNote.category === CeoNoteCategory.WHATSAPP) {
          const whatsapp = this.whatsappRepository.create({
            type: "whatsapp",
            contact_name: savedNote.related_person || "",
            phone_number: "",
            message_summary: savedNote.details || "",
            required_action: "",
            attachment_url: "",
            response_status: "",
            visit_datetime: savedNote.date || new Date(),
            related_note_id: savedNote.id,
            status: "Pending Reply",
            created_by_id: currentUser?.id || null,
          });
          await this.whatsappRepository.save(whatsapp);
        }
      }
    }

    // Send notification if note is assigned to someone
    if (savedNote.assigned_user_ids && savedNote.assigned_user_ids.length > 0) {
      const userIdsToNotify = savedNote.assigned_user_ids.filter(id => id !== currentUser?.id);
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

    return savedNote;
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
        .leftJoinAndSelect("note.assigned_users", "assigned_users");
      
      console.log('=== findAll query builder ===');

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
      relations: ["created_by", "related_task", "assigned_users"],
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

    const note = await this.findOne(id);
    const oldValue = { ...note };
    const oldAssignedUserIds = [...(note.assigned_user_ids || [])];

    Object.assign(note, updateCeoNoteDto);
    // Set assigned users if provided
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
    if (updateCeoNoteDto.follow_up_requested_date !== undefined) {
      note.follow_up_requested_date = this.safelyParseDate(updateCeoNoteDto.follow_up_requested_date);
    }
    if (updateCeoNoteDto.follow_up_last_date !== undefined) {
      note.follow_up_last_date = this.safelyParseDate(updateCeoNoteDto.follow_up_last_date);
    }
    if (updateCeoNoteDto.follow_up_next_date !== undefined) {
      note.follow_up_next_date = this.safelyParseDate(updateCeoNoteDto.follow_up_next_date);
    }
    if (updateCeoNoteDto.meeting_date !== undefined) {
      note.meeting_date = this.safelyParseDate(updateCeoNoteDto.meeting_date);
    }
    if (updateCeoNoteDto.waiting_response_request_date !== undefined) {
      note.waiting_response_request_date = this.safelyParseDate(updateCeoNoteDto.waiting_response_request_date);
    }
    if (updateCeoNoteDto.waiting_response_expected_date !== undefined) {
      note.waiting_response_expected_date = this.safelyParseDate(updateCeoNoteDto.waiting_response_expected_date);
    }
    if (updateCeoNoteDto.waiting_response_last_reminder_date !== undefined) {
      note.waiting_response_last_reminder_date = this.safelyParseDate(updateCeoNoteDto.waiting_response_last_reminder_date);
    }
    const updatedNote = await this.ceoNoteRepository.save(note);
    await this.logAudit(
      updatedNote,
      currentUser,
      "updated",
      oldValue,
      updatedNote,
    );

    // Update corresponding Visitor/Call/WhatsApp if category is visitors/calls/whatsapp
    if ([CeoNoteCategory.VISITORS, CeoNoteCategory.CALLS, CeoNoteCategory.WHATSAPP].includes(updatedNote.category)) {
      if (updatedNote.category === CeoNoteCategory.VISITORS) {
        const visitor = await this.visitorRepository.findOne({ where: { related_note_id: updatedNote.id } });
        if (visitor) {
          visitor.visitor_name = updatedNote.related_person || visitor.visitor_name;
          visitor.purpose = updatedNote.details || visitor.purpose;
          visitor.department = updatedNote.department || visitor.department;
          visitor.visit_datetime = updatedNote.date || visitor.visit_datetime;
          await this.visitorRepository.save(visitor);
        }
      } else if (updatedNote.category === CeoNoteCategory.CALLS) {
        const call = await this.callRepository.findOne({ where: { related_note_id: updatedNote.id } });
        if (call) {
          call.caller_name = updatedNote.related_person || call.caller_name;
          call.call_purpose = updatedNote.details || call.call_purpose;
          call.follow_up_date = updatedNote.due_date || call.follow_up_date;
          call.visit_datetime = updatedNote.date || call.visit_datetime;
          await this.callRepository.save(call);
        }
      } else if (updatedNote.category === CeoNoteCategory.WHATSAPP) {
        const whatsapp = await this.whatsappRepository.findOne({ where: { related_note_id: updatedNote.id } });
        if (whatsapp) {
          whatsapp.contact_name = updatedNote.related_person || whatsapp.contact_name;
          whatsapp.message_summary = updatedNote.details || whatsapp.message_summary;
          whatsapp.visit_datetime = updatedNote.date || whatsapp.visit_datetime;
          await this.whatsappRepository.save(whatsapp);
        }
      }
    }

    // Send notification if assignment changed
    const newAssignedUserIds = updatedNote.assigned_user_ids || [];
    const addedUserIds = newAssignedUserIds.filter(id => !oldAssignedUserIds.includes(id) && id !== currentUser?.id);
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

    return updatedNote;
  }

  async remove(id: number, currentUser: User) {
    const note = await this.findOne(id);
    await this.logAudit(note, currentUser, "deleted", note, null);
    
    // Delete corresponding Visitor/Call/WhatsApp if category is visitors/calls/whatsapp
    if ([CeoNoteCategory.VISITORS, CeoNoteCategory.CALLS, CeoNoteCategory.WHATSAPP].includes(note.category)) {
      if (note.category === CeoNoteCategory.VISITORS) {
        const visitor = await this.visitorRepository.findOne({ where: { related_note_id: note.id } });
        if (visitor) await this.visitorRepository.remove(visitor);
      } else if (note.category === CeoNoteCategory.CALLS) {
        const call = await this.callRepository.findOne({ where: { related_note_id: note.id } });
        if (call) await this.callRepository.remove(call);
      } else if (note.category === CeoNoteCategory.WHATSAPP) {
        const whatsapp = await this.whatsappRepository.findOne({ where: { related_note_id: note.id } });
        if (whatsapp) await this.whatsappRepository.remove(whatsapp);
      }
    }
    
    await this.ceoNoteRepository.remove(note);
    return { message: "Note deleted successfully" };
  }

  async approve(id: number, approveNoteDto: ApproveNoteDto, currentUser: User) {
    const note = await this.findOne(id);
    const oldValue = { ...note };
    const approvalEntry = {
      decision: approveNoteDto.decision,
      remarks: approveNoteDto.remarks || "",
      decision_date: new Date(),
      decision_by_id: currentUser?.id,
    };
    if (!note.approval_history) {
      note.approval_history = [];
    }
    note.approval_history.push(approvalEntry);

    if (approveNoteDto.decision === "approved") {
      note.status = CeoNoteStatus.APPROVED;
    } else if (approveNoteDto.decision === "rejected") {
      note.status = CeoNoteStatus.REJECTED;
    } else if (approveNoteDto.decision === "clarification_requested") {
      note.status = CeoNoteStatus.WAITING_RESPONSE;
    }

    const updatedNote = await this.ceoNoteRepository.save(note);
    await this.logAudit(
      updatedNote,
      currentUser,
      "approval",
      oldValue,
      updatedNote,
    );

    // Send approval notification to note creator/assigned users
    const userIdsToNotify = [];
    if (note.created_by_id) {
      userIdsToNotify.push(note.created_by_id);
    }
    if (note.assigned_user_ids && note.assigned_user_ids.length > 0) {
      note.assigned_user_ids.forEach(id => {
        if (!userIdsToNotify.includes(id)) {
          userIdsToNotify.push(id);
        }
      });
    }
    if (userIdsToNotify.length > 0) {
      await this.notificationsService.create(
        {
          title: `CEO Note ${approveNoteDto.decision === "approved" ? "Approved" : approveNoteDto.decision === "rejected" ? "Rejected" : "Clarification Requested"}`,
          message: `CEO note "${note.title}" has been ${approveNoteDto.decision === "approved" ? "approved" : approveNoteDto.decision === "rejected" ? "rejected" : "marked as waiting for clarification"}.`,
          type:
            approveNoteDto.decision === "approved"
              ? NotificationType.SUCCESS
              : approveNoteDto.decision === "rejected"
                ? NotificationType.ERROR
                : NotificationType.WARNING,
          link: `/ceo-office/notes/${id}`,
          metadata: { noteId: id, decision: approveNoteDto.decision },
        },
        userIdsToNotify,
        currentUser,
      );
    }

    return updatedNote;
  }

  async convertToTask(
    id: number,
    convertToTaskDto: ConvertToTaskDto,
    currentUser: User,
  ) {
    const note = await this.findOne(id);
    const oldValue = { ...note };

    // Helper to safely format date to YYYY-MM-DD
    const formatDate = (date: any): string | null => {
      if (!date) return null;
      // If it's already a string in YYYY-MM-DD format, return it
      if (typeof date === 'string') {
        return date;
      }
      // If it's a Date object, format it
      if (date instanceof Date && !isNaN(date.getTime())) {
        return date.toISOString().split("T")[0];
      }
      return null;
    };

    const createTaskDto: CreateTaskDto = {
      title: convertToTaskDto.task_title || note.title,
      description: convertToTaskDto.task_description || note.details,
      department: convertToTaskDto.task_department || note.department,
      priority:
        convertToTaskDto.task_priority || this.mapPriority(note.priority),
      due_date:
        convertToTaskDto.task_due_date || formatDate(note.due_date),
      assigned_users:
        convertToTaskDto.assigned_users ||
        note.assigned_user_ids || [],
      workflow_type: TaskWorkflowType.STANDARD,
      task_type: TaskType.ONE_TIME,
      mov_checklist: convertToTaskDto.mov_items?.map(item => ({
        text: item,
        checked: false,
        checked_by_id: null,
        checked_at: null
      })) || undefined,
    };

    const task = await this.tasksService.create(createTaskDto, currentUser);

    // Set source and source_id on task using taskRepository
    const taskToUpdate = await this.taskRepository.findOne({
      where: { id: task.id },
    });
    if (taskToUpdate) {
      taskToUpdate.source = "ceo_note";
      taskToUpdate.source_id = note.id;
      await this.taskRepository.save(taskToUpdate);
    }

    note.related_task_id = task.id;
    note.status = CeoNoteStatus.IN_PROGRESS;
    // Set assigned users on the note from the convert dto
    await this.setAssignedUsers(note, convertToTaskDto.assigned_users);
    const updatedNote = await this.ceoNoteRepository.save(note);

    await this.logAudit(
      updatedNote,
      currentUser,
      "converted_to_task",
      oldValue,
      { note: updatedNote, task_id: task.id },
    );

    // Send notification to assigned users
    const userIdsToNotify = createTaskDto.assigned_users;
    if (userIdsToNotify && userIdsToNotify.length > 0) {
      await this.notificationsService.create(
        {
          title: "CEO Note Converted to Task",
          message: `A CEO note "${note.title}" has been converted to a task and assigned to you.`,
          type: NotificationType.INFO,
          link: `/tasks/${task.id}`,
          metadata: { noteId: note.id, taskId: task.id },
        },
        userIdsToNotify,
        currentUser,
      );
    }

    return { note: updatedNote, task };
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
    console.log("getDashboardStats called with category:", category);
    const qb = this.ceoNoteRepository.createQueryBuilder("note");

    // Apply category filter if provided
    if (category) {
      console.log("Applying category filter:", category);
      qb.andWhere("note.category = :category", { category });
    }

    // Helper to fetch notes for a specific category (ignore global filter if showing all)
    const getNotesForCategory = async (cat: CeoNoteCategory) => {
      const categoryQb = this.ceoNoteRepository.createQueryBuilder("note");
      if (category) {
        categoryQb.andWhere("note.category = :category", { category });
      } else {
        categoryQb.andWhere("note.category = :cat", { cat });
      }
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
    // Pending approvals: only EMAILS_AND_APPROVALS category with PENDING status, ignore global filter
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

    // Fetch data from separate Visitors and ProjectCommandSheets entities
    const recentVisitors = await this.visitorsService.getRecentVisitors(10);
    const recentCalls = await this.visitorsService.getRecentCalls(10);
    const recentWhatsapps = await this.visitorsService.getRecentWhatsapps(10);
    const visitorsResult = await this.visitorsService.findAll({
      page: 1,
      pageSize: 10,
    });
    const projectSheetsResult = await this.projectCommandSheetsService.findAll({
      page: 1,
      pageSize: 10,
    });

    // Combine notes and visitor/call/whatsapp records, avoiding duplicates
    const getCombinedList = (notes: any[], records: any[], noteCategory: string, recordType: string) => {
      const noteIds = new Set(notes.map(n => n.id));
      const filteredRecords = records.filter(r => !r.related_note_id || !noteIds.has(r.related_note_id));
      
      const processedNotes = notes.map(note => ({ 
        ...note, 
        source: "ceo-note",
        // Add fields for getItemTitle to find
        title: note.title,
        caller_name: note.related_person,
        contact_name: note.related_person,
        visitor_name: note.related_person,
      }));
      
      const processedRecords = filteredRecords.map(record => ({ 
        ...record, 
        source: "visitor-record",
        type: recordType,
        // Add status if not present
        status: record.status || "Pending"
      }));

      // Combine and sort by date descending
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
}
