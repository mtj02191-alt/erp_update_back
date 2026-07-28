import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, SelectQueryBuilder, Brackets, In } from "typeorm";
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
    if (!dateString || dateString.trim() === "") {
      return undefined;
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return undefined;
    }
    return date;
  }

  private async setAssignedUsers(note: CeoNote, assignedUserIds?: (string | number)[]) {
    console.log("=== setAssignedUsers ===");
    console.log("assignedUserIds:", assignedUserIds);

    const numericUserIds = assignedUserIds?.map(id => Number(id)).filter(id => !isNaN(id)) || [];

    if (numericUserIds.length === 0) {
      note.assigned_users = [];
      note.assigned_user_ids = [];
      console.log("No valid assignedUserIds, setting to empty arrays");
      return;
    }

    console.log("Fetching users by ids:", numericUserIds);
    const users = await this.userRepository.findBy({ id: In(numericUserIds) });
    console.log("Found users:", users);

    note.assigned_users = users;
    note.assigned_user_ids = users.map(user => user.id);
    console.log("Set note.assigned_users:", note.assigned_users);
    console.log("Set note.assigned_user_ids:", note.assigned_user_ids);
  }

  private async createCategoryRecord(note: CeoNote, dto: any) {
    const category = note.category;

    if (category === CeoNoteCategory.MEETINGS) {
      const meeting = this.meetingRepository.create({
        note_id: note.id,
        meeting_date: this.safelyParseDate(dto.meeting_date),
        meeting_with: dto.meeting_with || null,
        meeting_subject: dto.meeting_subject || null,
        meeting_discussion_points: dto.meeting_discussion_points || [],
        meeting_decisions: dto.meeting_decisions || [],
        meeting_action_items: dto.meeting_action_items || [],
      });
      await this.meetingRepository.save(meeting);
      note.meeting_detail = meeting;
    } else if (category === CeoNoteCategory.EMAILS_AND_APPROVALS) {
      const approval = this.approvalRepository.create({
        note_id: note.id,
        approval_type: dto.approval_type || null,
        approval_requested_by: dto.approval_requested_by || null,
        approval_subject: dto.approval_subject || null,
        approval_reference_number: dto.approval_reference_number || null,
        approval_amount: dto.approval_amount || null,
        approval_decision: dto.approval_decision || "pending",
        approval_decision_remarks: dto.approval_decision_remarks || null,
        approval_history: dto.approval_history || null,
      });
      await this.approvalRepository.save(approval);
      note.approval_detail = approval;
    } else if (category === CeoNoteCategory.FOLLOW_UP) {
      const followUp = this.followUpRepository.create({
        note_id: note.id,
        follow_up_requested_from: dto.follow_up_requested_from || null,
        follow_up_requested_date: this.safelyParseDate(dto.follow_up_requested_date),
        follow_up_last_date: this.safelyParseDate(dto.follow_up_last_date),
        follow_up_next_date: this.safelyParseDate(dto.follow_up_next_date),
        follow_up_current_response: dto.follow_up_current_response || null,
        follow_up_remarks: dto.follow_up_remarks || null,
        follow_up_history: dto.follow_up_history || [],
      });
      await this.followUpRepository.save(followUp);
      note.follow_up_detail = followUp;
    } else if (category === CeoNoteCategory.WAITING_RESPONSE) {
      const waitingResponse = this.waitingResponseRepository.create({
        note_id: note.id,
        waiting_response_requested_from: dto.waiting_response_requested_from || null,
        waiting_response_request_date: this.safelyParseDate(dto.waiting_response_request_date),
        waiting_response_expected_date: this.safelyParseDate(dto.waiting_response_expected_date),
        waiting_response_last_reminder_date: this.safelyParseDate(dto.waiting_response_last_reminder_date),
        waiting_response_status: dto.waiting_response_status || "waiting_response",
        waiting_response_remarks: dto.waiting_response_remarks || null,
        waiting_response_reminders: dto.waiting_response_reminders || [],
      });
      await this.waitingResponseRepository.save(waitingResponse);
      note.waiting_response_detail = waitingResponse;
    } else if (category === CeoNoteCategory.PROJECT_COMMAND_SHEETS) {
      const pcs = this.pcsRepository.create({
        note_id: note.id,
        project_name: dto.project_name || "",
        project_details: dto.project_details || null,
        discussions: dto.discussions || null,
        decisions: dto.decisions || null,
        meeting_notes: dto.meeting_notes || null,
        pending_items: dto.pending_items || null,
        action_items: dto.action_items || null,
        next_steps: dto.next_steps || null,
        results: dto.results || null,
        start_date: this.safelyParseDate(dto.start_date),
        end_date: this.safelyParseDate(dto.end_date),
        status: dto.pcs_status || "Pending",
        created_by_id: note.created_by_id,
      });
      await this.pcsRepository.save(pcs);
      note.project_command_sheet_detail = pcs;
    } else if (category === CeoNoteCategory.VISITORS) {
      const visitor = this.visitorRepository.create({
        type: "visitor",
        visitor_name: note.related_person || "",
        organization: "",
        purpose: note.details || "",
        meeting_with: "",
        department: note.department || null,
        protocol_required: "",
        expected_duration: "",
        visitor_outcome: "",
        visit_datetime: note.date || new Date(),
        related_note_id: note.id,
        status: "Pending",
        created_by_id: note.created_by_id,
      });
      await this.visitorRepository.save(visitor);
      note.visitor_detail = visitor;
    } else if (category === CeoNoteCategory.CALLS) {
      const call = this.callRepository.create({
        type: "call",
        caller_name: note.related_person || "",
        organization: "",
        phone_number: "",
        call_purpose: note.details || "",
        call_summary: "",
        follow_up_required: "No",
        follow_up_date: note.due_date || null,
        visit_datetime: note.date || new Date(),
        related_note_id: note.id,
        status: "Pending",
        created_by_id: note.created_by_id,
      });
      await this.callRepository.save(call);
      note.call_detail = call;
    } else if (category === CeoNoteCategory.WHATSAPP) {
      const whatsapp = this.whatsappRepository.create({
        type: "whatsapp",
        contact_name: note.related_person || "",
        phone_number: "",
        message_summary: note.details || "",
        required_action: "",
        attachment_url: "",
        response_status: "",
        visit_datetime: note.date || new Date(),
        related_note_id: note.id,
        status: "Pending Reply",
        created_by_id: note.created_by_id,
      });
      await this.whatsappRepository.save(whatsapp);
      note.whatsapp_detail = whatsapp;
    }
  }

  private async updateCategoryRecord(note: CeoNote, dto: any) {
    const category = note.category;

    if (category === CeoNoteCategory.MEETINGS) {
      let meeting = await this.meetingRepository.findOne({ where: { note_id: note.id } });
      if (!meeting) {
        meeting = this.meetingRepository.create({ note_id: note.id });
      }
      if (dto.meeting_date !== undefined) meeting.meeting_date = this.safelyParseDate(dto.meeting_date);
      if (dto.meeting_with !== undefined) meeting.meeting_with = dto.meeting_with;
      if (dto.meeting_subject !== undefined) meeting.meeting_subject = dto.meeting_subject;
      if (dto.meeting_discussion_points !== undefined) meeting.meeting_discussion_points = dto.meeting_discussion_points;
      if (dto.meeting_decisions !== undefined) meeting.meeting_decisions = dto.meeting_decisions;
      if (dto.meeting_action_items !== undefined) meeting.meeting_action_items = dto.meeting_action_items;
      await this.meetingRepository.save(meeting);
      note.meeting_detail = meeting;
    } else if (category === CeoNoteCategory.EMAILS_AND_APPROVALS) {
      let approval = await this.approvalRepository.findOne({ where: { note_id: note.id } });
      if (!approval) {
        approval = this.approvalRepository.create({ note_id: note.id });
      }
      if (dto.approval_type !== undefined) approval.approval_type = dto.approval_type;
      if (dto.approval_requested_by !== undefined) approval.approval_requested_by = dto.approval_requested_by;
      if (dto.approval_subject !== undefined) approval.approval_subject = dto.approval_subject;
      if (dto.approval_reference_number !== undefined) approval.approval_reference_number = dto.approval_reference_number;
      if (dto.approval_amount !== undefined) approval.approval_amount = dto.approval_amount;
      if (dto.approval_decision !== undefined) approval.approval_decision = dto.approval_decision;
      if (dto.approval_decision_remarks !== undefined) approval.approval_decision_remarks = dto.approval_decision_remarks;
      await this.approvalRepository.save(approval);
      note.approval_detail = approval;
    } else if (category === CeoNoteCategory.FOLLOW_UP) {
      let followUp = await this.followUpRepository.findOne({ where: { note_id: note.id } });
      if (!followUp) {
        followUp = this.followUpRepository.create({ note_id: note.id });
      }
      if (dto.follow_up_requested_from !== undefined) followUp.follow_up_requested_from = dto.follow_up_requested_from;
      if (dto.follow_up_requested_date !== undefined) followUp.follow_up_requested_date = this.safelyParseDate(dto.follow_up_requested_date);
      if (dto.follow_up_last_date !== undefined) followUp.follow_up_last_date = this.safelyParseDate(dto.follow_up_last_date);
      if (dto.follow_up_next_date !== undefined) followUp.follow_up_next_date = this.safelyParseDate(dto.follow_up_next_date);
      if (dto.follow_up_current_response !== undefined) followUp.follow_up_current_response = dto.follow_up_current_response;
      if (dto.follow_up_remarks !== undefined) followUp.follow_up_remarks = dto.follow_up_remarks;
      if (dto.follow_up_history !== undefined) followUp.follow_up_history = dto.follow_up_history;
      await this.followUpRepository.save(followUp);
      note.follow_up_detail = followUp;
    } else if (category === CeoNoteCategory.WAITING_RESPONSE) {
      let waitingResponse = await this.waitingResponseRepository.findOne({ where: { note_id: note.id } });
      if (!waitingResponse) {
        waitingResponse = this.waitingResponseRepository.create({ note_id: note.id });
      }
      if (dto.waiting_response_requested_from !== undefined) waitingResponse.waiting_response_requested_from = dto.waiting_response_requested_from;
      if (dto.waiting_response_request_date !== undefined) waitingResponse.waiting_response_request_date = this.safelyParseDate(dto.waiting_response_request_date);
      if (dto.waiting_response_expected_date !== undefined) waitingResponse.waiting_response_expected_date = this.safelyParseDate(dto.waiting_response_expected_date);
      if (dto.waiting_response_last_reminder_date !== undefined) waitingResponse.waiting_response_last_reminder_date = this.safelyParseDate(dto.waiting_response_last_reminder_date);
      if (dto.waiting_response_status !== undefined) waitingResponse.waiting_response_status = dto.waiting_response_status;
      if (dto.waiting_response_remarks !== undefined) waitingResponse.waiting_response_remarks = dto.waiting_response_remarks;
      if (dto.waiting_response_reminders !== undefined) waitingResponse.waiting_response_reminders = dto.waiting_response_reminders;
      await this.waitingResponseRepository.save(waitingResponse);
      note.waiting_response_detail = waitingResponse;
    } else if (category === CeoNoteCategory.PROJECT_COMMAND_SHEETS) {
      let pcs = await this.pcsRepository.findOne({ where: { note_id: note.id } });
      if (!pcs) {
        pcs = this.pcsRepository.create({ note_id: note.id });
      }
      if (dto.project_name !== undefined) pcs.project_name = dto.project_name;
      if (dto.project_details !== undefined) pcs.project_details = dto.project_details;
      if (dto.discussions !== undefined) pcs.discussions = dto.discussions;
      if (dto.decisions !== undefined) pcs.decisions = dto.decisions;
      if (dto.meeting_notes !== undefined) pcs.meeting_notes = dto.meeting_notes;
      if (dto.pending_items !== undefined) pcs.pending_items = dto.pending_items;
      if (dto.action_items !== undefined) pcs.action_items = dto.action_items;
      if (dto.next_steps !== undefined) pcs.next_steps = dto.next_steps;
      if (dto.results !== undefined) pcs.results = dto.results;
      if (dto.start_date !== undefined) pcs.start_date = this.safelyParseDate(dto.start_date);
      if (dto.end_date !== undefined) pcs.end_date = this.safelyParseDate(dto.end_date);
      if (dto.pcs_status !== undefined) pcs.status = dto.pcs_status;
      await this.pcsRepository.save(pcs);
      note.project_command_sheet_detail = pcs;
    } else if (category === CeoNoteCategory.VISITORS) {
      const visitor = await this.visitorRepository.findOne({ where: { related_note_id: note.id } });
      if (visitor) {
        if (dto.related_person !== undefined) visitor.visitor_name = dto.related_person || visitor.visitor_name;
        if (dto.details !== undefined) visitor.purpose = dto.details || visitor.purpose;
        if (dto.department !== undefined) visitor.department = dto.department || visitor.department;
        if (dto.date !== undefined) visitor.visit_datetime = this.safelyParseDate(dto.date) || visitor.visit_datetime;
        await this.visitorRepository.save(visitor);
        note.visitor_detail = visitor;
      }
    } else if (category === CeoNoteCategory.CALLS) {
      const call = await this.callRepository.findOne({ where: { related_note_id: note.id } });
      if (call) {
        if (dto.related_person !== undefined) call.caller_name = dto.related_person || call.caller_name;
        if (dto.details !== undefined) call.call_purpose = dto.details || call.call_purpose;
        if (dto.due_date !== undefined) call.follow_up_date = this.safelyParseDate(dto.due_date) || call.follow_up_date;
        if (dto.date !== undefined) call.visit_datetime = this.safelyParseDate(dto.date) || call.visit_datetime;
        await this.callRepository.save(call);
        note.call_detail = call;
      }
    } else if (category === CeoNoteCategory.WHATSAPP) {
      const whatsapp = await this.whatsappRepository.findOne({ where: { related_note_id: note.id } });
      if (whatsapp) {
        if (dto.related_person !== undefined) whatsapp.contact_name = dto.related_person || whatsapp.contact_name;
        if (dto.details !== undefined) whatsapp.message_summary = dto.details || whatsapp.message_summary;
        if (dto.date !== undefined) whatsapp.visit_datetime = this.safelyParseDate(dto.date) || whatsapp.visit_datetime;
        await this.whatsappRepository.save(whatsapp);
        note.whatsapp_detail = whatsapp;
      }
    }
  }

  private async deleteCategoryRecord(note: CeoNote) {
    const category = note.category;
    if (category === CeoNoteCategory.MEETINGS) {
      await this.meetingRepository.delete({ note_id: note.id });
    } else if (category === CeoNoteCategory.EMAILS_AND_APPROVALS) {
      await this.approvalRepository.delete({ note_id: note.id });
    } else if (category === CeoNoteCategory.FOLLOW_UP) {
      await this.followUpRepository.delete({ note_id: note.id });
    } else if (category === CeoNoteCategory.WAITING_RESPONSE) {
      await this.waitingResponseRepository.delete({ note_id: note.id });
    } else if (category === CeoNoteCategory.PROJECT_COMMAND_SHEETS) {
      await this.pcsRepository.delete({ note_id: note.id });
    } else if (category === CeoNoteCategory.VISITORS) {
      const visitor = await this.visitorRepository.findOne({ where: { related_note_id: note.id } });
      if (visitor) await this.visitorRepository.remove(visitor);
    } else if (category === CeoNoteCategory.CALLS) {
      const call = await this.callRepository.findOne({ where: { related_note_id: note.id } });
      if (call) await this.callRepository.remove(call);
    } else if (category === CeoNoteCategory.WHATSAPP) {
      const whatsapp = await this.whatsappRepository.findOne({ where: { related_note_id: note.id } });
      if (whatsapp) await this.whatsappRepository.remove(whatsapp);
    }
  }

  async create(createCeoNoteDto: CreateCeoNoteDto, currentUser: User) {

    const noteData: Partial<CeoNote> = {
      ...createCeoNoteDto,
      created_by_id: currentUser?.id || null,
      date: this.safelyParseDate(createCeoNoteDto.date) || new Date(),
      due_date: this.safelyParseDate(createCeoNoteDto.due_date),
    };
    const note = this.ceoNoteRepository.create(noteData);
    await this.setAssignedUsers(note, createCeoNoteDto.assigned_user_ids);
    const savedNote = await this.ceoNoteRepository.save(note);
    await this.logAudit(savedNote, currentUser, "created", null, savedNote);

    await this.createCategoryRecord(savedNote, createCeoNoteDto);
    await this.ceoNoteRepository.save(savedNote);

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

    return this.findOne(savedNote.id);
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

      console.log("=== findAll query builder ===");

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

    const note = await this.findOne(id);
    const oldValue = { ...note };
    const oldAssignedUserIds = [...(note.assigned_user_ids || [])];

    Object.assign(note, updateCeoNoteDto);
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
    const updatedNote = await this.ceoNoteRepository.save(note);
    await this.logAudit(
      updatedNote,
      currentUser,
      "updated",
      oldValue,
      updatedNote,
    );

    await this.updateCategoryRecord(updatedNote, updateCeoNoteDto);
    await this.ceoNoteRepository.save(updatedNote);

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

    return this.findOne(updatedNote.id);
  }

  async remove(id: number, currentUser: User) {
    const note = await this.findOne(id);
    await this.logAudit(note, currentUser, "deleted", note, null);

    await this.deleteCategoryRecord(note);

    await this.ceoNoteRepository.remove(note);
    return { message: "Note deleted successfully" };
  }

  async approve(id: number, approveNoteDto: ApproveNoteDto, currentUser: User) {
    const note = await this.findOne(id);
    const oldValue = { ...note };
    
    let approval = note.approval_detail;
    if (!approval) {
      approval = this.approvalRepository.create({ note_id: note.id });
    }
    if (!approval.approval_history) {
      approval.approval_history = [];
    }
    const approvalEntry = {
      decision: approveNoteDto.decision,
      remarks: approveNoteDto.remarks || "",
      decision_date: new Date(),
      decision_by_id: currentUser?.id,
    };
    approval.approval_history.push(approvalEntry);
    await this.approvalRepository.save(approval);
    note.approval_detail = approval;

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

    return this.findOne(updatedNote.id);
  }

  async convertToTask(
    id: number,
    convertToTaskDto: ConvertToTaskDto,
    currentUser: User,
  ) {
    const note = await this.findOne(id);
    const oldValue = { ...note };

    const formatDate = (date: any): string | null => {
      if (!date) return null;
      if (typeof date === "string") {
        return date;
      }
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
    await this.setAssignedUsers(note, convertToTaskDto.assigned_users);
    const updatedNote = await this.ceoNoteRepository.save(note);

    await this.logAudit(
      updatedNote,
      currentUser,
      "converted_to_task",
      oldValue,
      { note: updatedNote, task_id: task.id },
    );

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

    return { note: await this.findOne(updatedNote.id), task };
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

    if (category) {
      console.log("Applying category filter:", category);
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
}
