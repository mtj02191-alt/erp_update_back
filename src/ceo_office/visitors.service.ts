import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, DataSource, EntityManager } from "typeorm";
import { Visitor } from "./entities/visitor.entity";
import { Call } from "./entities/call.entity";
import { WhatsAppMessage } from "./entities/whatsapp.entity";
import { CeoNote, CeoNoteStatus } from "./entities/ceo-note.entity";
import { User, Department } from "../users/user.entity";
import { TasksService } from "../tasks/tasks.service";
import { Task, TaskWorkflowType, TaskPriority, TaskType } from "../tasks/entities/task.entity";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationType } from "../notifications/entities/notification.entity";
import { CreateTaskDto } from "../tasks/dto/create-task.dto";
import { CeoNotesService } from "./ceo-notes.service";
import { CeoNoteCategory } from "./entities/ceo-note.entity";
import { ConvertToTaskDto } from "./dto/convert-to-task.dto";

@Injectable()
export class VisitorsService {
  private readonly logger = new Logger(VisitorsService.name);

  constructor(
    @InjectRepository(Visitor)
    private readonly visitorRepository: Repository<Visitor>,
    @InjectRepository(Call)
    private readonly callRepository: Repository<Call>,
    @InjectRepository(WhatsAppMessage)
    private readonly whatsappRepository: Repository<WhatsAppMessage>,
    @InjectRepository(CeoNote)
    private readonly ceoNoteRepository: Repository<CeoNote>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly tasksService: TasksService,
    private readonly notificationsService: NotificationsService,
    private readonly ceoNotesService: CeoNotesService,
    private readonly dataSource: DataSource,
  ) {}

  private async validateRelatedNoteId(noteId?: number): Promise<number | null> {
    if (!noteId || noteId <= 0) {
      return null;
    }
    const noteExists = await this.ceoNoteRepository.findOne({
      where: { id: noteId },
    });
    if (!noteExists) {
      throw new BadRequestException(
        `Related note with id ${noteId} does not exist.`,
      );
    }
    return noteId;
  }

  private safelyParseDate(dateString?: string): Date | null {
    if (!dateString || dateString.trim() === '') {
      return null;
    }
    const date = new Date(dateString);
    if (isNaN(date.getTime())) {
      return null;
    }
    return date;
  }

  async create(data: any, currentUser: User) {
    const type = (data.type || "visitor").toLowerCase();
    const relatedNoteId = await this.validateRelatedNoteId(
      data.related_note_id,
    );

    const noteCategory =
      type === "call"
        ? CeoNoteCategory.CALLS
        : type === "whatsapp"
        ? CeoNoteCategory.WHATSAPP
        : CeoNoteCategory.VISITORS;
    const noteTitle =
      type === "call"
        ? `Call with ${data.caller_name || "Unknown"}`
        : type === "whatsapp"
        ? `WhatsApp with ${data.contact_name || "Unknown"}`
        : `Visit from ${data.visitor_name || "Unknown"}`;
    const noteDetails =
      type === "call"
        ? `Purpose: ${data.call_purpose || ""}\nSummary: ${data.call_summary || ""}`
        : type === "whatsapp"
        ? `Message Summary: ${data.message_summary || ""}\nRequired Action: ${data.required_action || ""}`
        : `Purpose: ${data.purpose || ""}\nOrganization: ${data.organization || ""}`;

    const ceoNotePayload: any = {
      category: noteCategory,
      title: noteTitle,
      details: noteDetails,
      related_person:
        type === "call"
          ? data.caller_name
          : type === "whatsapp"
          ? data.contact_name
          : data.visitor_name,
      department: data.department || null,
      priority: "medium",
      status: CeoNoteStatus.UNPROCESSED,
      visit_datetime: data.visit_datetime,
      follow_up_date: data.follow_up_date,
      visitor_name: data.visitor_name,
      organization: data.organization,
      purpose: data.purpose,
      meeting_with: data.meeting_with,
      protocol_required: data.protocol_required,
      expected_duration: data.expected_duration,
      visitor_outcome: data.visitor_outcome,
      caller_name: data.caller_name,
      phone_number: data.phone_number,
      call_purpose: data.call_purpose,
      call_summary: data.call_summary,
      follow_up_required: data.follow_up_required,
      contact_name: data.contact_name,
      message_summary: data.message_summary,
      required_action: data.required_action,
      attachment_url: data.attachment_url,
      response_status: data.response_status,
      remarks: data.remarks,
      related_note_id: relatedNoteId,
    };

    if (relatedNoteId) {
      return this.ceoNotesService.update(
        relatedNoteId,
        ceoNotePayload,
        currentUser,
      );
    }

    return this.ceoNotesService.create(ceoNotePayload, currentUser);
  }

  async findAll(payload: any) {
    const page = +(payload?.pagination?.page || payload?.page || 1);
    const pageSize = +(
      payload?.pagination?.pageSize ||
      payload?.pageSize ||
      10
    );

    // Fetch totals first for correct pagination
    const visitorsTotal = await this.visitorRepository.count();
    const callsTotal = await this.callRepository.count();
    const whatsappsTotal = await this.whatsappRepository.count();
    const total = visitorsTotal + callsTotal + whatsappsTotal;

    if (pageSize === -1) {
      // No pagination: fetch all
      const [visitors, calls, whatsapps] = await Promise.all([
        this.visitorRepository.find({ order: { visit_datetime: "DESC" }, relations: ["related_note"] }),
        this.callRepository.find({ order: { visit_datetime: "DESC" }, relations: ["related_note"] }),
        this.whatsappRepository.find({ order: { visit_datetime: "DESC" }, relations: ["related_note"] }),
      ]);
      const all = [...visitors, ...calls, ...whatsapps];
      all.sort((a, b) => new Date(b.visit_datetime).getTime() - new Date(a.visit_datetime).getTime());
      return { data: all, total, page, pageSize, totalPages: 1 };
    }

    const skip = (page - 1) * pageSize;

    // Fetch enough from each table to cover the current page
    const fetchLimit = skip + pageSize;
    const [visitors, calls, whatsapps] = await Promise.all([
      this.visitorRepository.find({
        take: fetchLimit,
        order: { visit_datetime: "DESC" },
        relations: ["related_note"],
      }),
      this.callRepository.find({
        take: fetchLimit,
        order: { visit_datetime: "DESC" },
        relations: ["related_note"],
      }),
      this.whatsappRepository.find({
        take: fetchLimit,
        order: { visit_datetime: "DESC" },
        relations: ["related_note"],
      }),
    ]);

    // Combine, sort, and slice for current page
    const all = [...visitors, ...calls, ...whatsapps];
    all.sort((a, b) => new Date(b.visit_datetime).getTime() - new Date(a.visit_datetime).getTime());
    const paged = all.slice(skip, skip + pageSize);

    return {
      data: paged,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(id: number, type?: string) {
    if (type) {
      const t = type.toLowerCase();
      if (t === "call") {
        const call = await this.callRepository.findOne({
          where: { id },
          relations: ["created_by", "related_note", "related_task"],
        });
        if (!call) throw new NotFoundException(`Call with ID ${id} not found`);
        return { ...call, _type: "call" };
      }
      if (t === "whatsapp") {
        const whatsapp = await this.whatsappRepository.findOne({
          where: { id },
          relations: ["created_by", "related_note", "related_task"],
        });
        if (!whatsapp) throw new NotFoundException(`WhatsApp with ID ${id} not found`);
        return { ...whatsapp, _type: "whatsapp" };
      }
      // Default: visitor
      const visitor = await this.visitorRepository.findOne({
        where: { id },
        relations: ["created_by", "related_note", "related_task"],
      });
      if (!visitor) throw new NotFoundException(`Visitor with ID ${id} not found`);
      return { ...visitor, _type: "visitor" };
    }

    // If no type specified, try all (legacy behavior) but tag result
    let entity: any = await this.visitorRepository.findOne({
      where: { id },
      relations: ["created_by", "related_note", "related_task"],
    });
    if (entity) return { ...entity, _type: "visitor" };

    entity = await this.callRepository.findOne({
      where: { id },
      relations: ["created_by", "related_note", "related_task"],
    });
    if (entity) return { ...entity, _type: "call" };

    entity = await this.whatsappRepository.findOne({
      where: { id },
      relations: ["created_by", "related_note", "related_task"],
    });
    if (entity) return { ...entity, _type: "whatsapp" };

    throw new NotFoundException(`Record with ID ${id} not found`);
  }

  async update(id: number, data: any, currentUser: User) {
    const type = (data.type || "visitor").toLowerCase();
    const relatedNoteId =
      data.related_note_id !== undefined
        ? await this.validateRelatedNoteId(data.related_note_id)
        : undefined;

    const noteCategory =
      type === "call"
        ? CeoNoteCategory.CALLS
        : type === "whatsapp"
        ? CeoNoteCategory.WHATSAPP
        : CeoNoteCategory.VISITORS;

    let repository: Repository<any>;
    let entity: any;
    if (type === "call") {
      repository = this.callRepository;
    } else if (type === "whatsapp") {
      repository = this.whatsappRepository;
    } else {
      repository = this.visitorRepository;
    }

    entity = await repository.findOne({ where: { id } });
    if (!entity) {
      throw new NotFoundException(`${type.charAt(0).toUpperCase() + type.slice(1)} with ID ${id} not found`);
    }

    const noteId = relatedNoteId ?? entity.related_note_id;
    if (noteId) {
      const ceoNotePayload: any = {
        category: noteCategory,
        title:
          type === "call"
            ? `Call with ${data.caller_name || entity.caller_name || "Unknown"}`
            : type === "whatsapp"
            ? `WhatsApp with ${data.contact_name || entity.contact_name || "Unknown"}`
            : `Visit from ${data.visitor_name || entity.visitor_name || "Unknown"}`,
        details:
          type === "call"
            ? `Purpose: ${data.call_purpose || entity.call_purpose || ""}\nSummary: ${data.call_summary || entity.call_summary || ""}`
            : type === "whatsapp"
            ? `Message Summary: ${data.message_summary || entity.message_summary || ""}\nRequired Action: ${data.required_action || entity.required_action || ""}`
            : `Purpose: ${data.purpose || entity.purpose || ""}\nOrganization: ${data.organization || entity.organization || ""}`,
        related_person:
          type === "call"
            ? data.caller_name || entity.caller_name
            : type === "whatsapp"
            ? data.contact_name || entity.contact_name
            : data.visitor_name || entity.visitor_name,
        department: data.department || entity.department,
        visit_datetime: data.visit_datetime || entity.visit_datetime,
        follow_up_date: data.follow_up_date || entity.follow_up_date,
        visitor_name: data.visitor_name || entity.visitor_name,
        organization: data.organization || entity.organization,
        purpose: data.purpose || entity.purpose,
        meeting_with: data.meeting_with || entity.meeting_with,
        protocol_required: data.protocol_required || entity.protocol_required,
        expected_duration: data.expected_duration || entity.expected_duration,
        visitor_outcome: data.visitor_outcome || entity.visitor_outcome,
        caller_name: data.caller_name || entity.caller_name,
        phone_number: data.phone_number || entity.phone_number,
        call_purpose: data.call_purpose || entity.call_purpose,
        call_summary: data.call_summary || entity.call_summary,
        follow_up_required: data.follow_up_required || entity.follow_up_required,
        contact_name: data.contact_name || entity.contact_name,
        message_summary: data.message_summary || entity.message_summary,
        required_action: data.required_action || entity.required_action,
        attachment_url: data.attachment_url || entity.attachment_url,
        response_status: data.response_status || entity.response_status,
        remarks: data.remarks || entity.remarks,
        status: data.status || entity.status,
      };
      await this.ceoNotesService.update(noteId, ceoNotePayload, currentUser);
      return this.findOne(id, type);
    }

    // Preserve legacy update when no linked note exists
    const updateData: any = { ...data };
    if (data.visit_datetime !== undefined)
      updateData.visit_datetime = this.safelyParseDate(data.visit_datetime);
    if (data.follow_up_date !== undefined)
      updateData.follow_up_date = this.safelyParseDate(data.follow_up_date);

    Object.assign(entity, updateData);
    return await repository.save(entity);
  }

  async remove(id: number, currentUser: User, type?: string) {
    let entity: any = null;
    let repository: Repository<any> | null = null;

    // Find the entity first
    if (type) {
      const t = type.toLowerCase();
      if (t === "call") {
        entity = await this.callRepository.findOne({ where: { id } });
        repository = this.callRepository;
      } else if (t === "whatsapp") {
        entity = await this.whatsappRepository.findOne({ where: { id } });
        repository = this.whatsappRepository;
      } else {
        entity = await this.visitorRepository.findOne({ where: { id } });
        repository = this.visitorRepository;
      }
    } else {
      // Try all types
      entity = await this.visitorRepository.findOne({ where: { id } });
      repository = entity ? this.visitorRepository : null;
      
      if (!entity) {
        entity = await this.callRepository.findOne({ where: { id } });
        repository = entity ? this.callRepository : null;
      }
      
      if (!entity) {
        entity = await this.whatsappRepository.findOne({ where: { id } });
        repository = entity ? this.whatsappRepository : null;
      }
    }

    if (!entity || !repository) {
      throw new NotFoundException(`Record with ID ${id} not found`);
    }

    if (entity.related_note_id) {
      await this.ceoNotesService.remove(entity.related_note_id, currentUser);
      return { message: "Record and linked CEO note deleted successfully" };
    }

    await repository.remove(entity);
    const entityType = type || (repository === this.callRepository ? "call" : repository === this.whatsappRepository ? "whatsapp" : "visitor");
    const typeName = entityType.charAt(0).toUpperCase() + entityType.slice(1);
    return { message: `${typeName} deleted successfully` };
  }

  async getRecentCalls(limit: number = 10) {
    return await this.callRepository.find({
      take: limit,
      order: { visit_datetime: "DESC" },
    });
  }

  async getRecentWhatsapps(limit: number = 10) {
    return await this.whatsappRepository.find({
      take: limit,
      order: { visit_datetime: "DESC" },
    });
  }

  async getRecentVisitors(limit: number = 10) {
    return await this.visitorRepository.find({
      take: limit,
      order: { visit_datetime: "DESC" },
    });
  }

  async convertToTask(id: number, convertToTaskDto: ConvertToTaskDto, currentUser: User) {
    // First find the entity (any of the three types)
    let entity: any = await this.visitorRepository.findOne({ where: { id } });
    let repository: Repository<any> = this.visitorRepository;

    if (!entity) {
      entity = await this.callRepository.findOne({ where: { id } });
      repository = this.callRepository;
    }

    if (!entity) {
      entity = await this.whatsappRepository.findOne({ where: { id } });
      repository = this.whatsappRepository;
    }

    if (!entity) {
      throw new NotFoundException(`Record with ID ${id} not found`);
    }

    // Check if already converted
    if (entity.related_task_id) {
      throw new BadRequestException("Record has already been converted to a task");
    }

    // Determine title and description based on type
    let title: string;
    let description: string;
    if (entity.type === 'call') {
      title = convertToTaskDto.task_title || `Follow up with ${entity.caller_name || 'Caller'}`;
      description = convertToTaskDto.task_description || `Call Purpose: ${entity.call_purpose || 'N/A'}\nOrganization: ${entity.organization || 'N/A'}\nRemarks: ${entity.remarks || 'N/A'}`;
    } else if (entity.type === 'whatsapp') {
      title = convertToTaskDto.task_title || `Follow up with ${entity.contact_name || 'Contact'}`;
      description = convertToTaskDto.task_description || `Message Summary: ${entity.message_summary || 'N/A'}\nOrganization: ${entity.organization || 'N/A'}\nRemarks: ${entity.remarks || 'N/A'}`;
    } else {
      title = convertToTaskDto.task_title || `Follow up with ${entity.visitor_name || 'Visitor'}`;
      description = convertToTaskDto.task_description || `Purpose: ${entity.purpose || 'N/A'}\nOrganization: ${entity.organization || 'N/A'}\nRemarks: ${entity.remarks || 'N/A'}`;
    }

    const createTaskDto: CreateTaskDto = {
      title,
      description,
      department: convertToTaskDto.task_department || Department.ADMIN,
      priority: convertToTaskDto.task_priority || TaskPriority.MEDIUM,
      due_date: convertToTaskDto.task_due_date || null,
      assigned_users: convertToTaskDto.assigned_users || [],
      workflow_type: TaskWorkflowType.STANDARD,
      task_type: TaskType.ONE_TIME,
      mov_checklist: convertToTaskDto.mov_items?.map(item => ({
        text: item,
        checked: false,
        checked_by_id: null,
        checked_at: null
      })) || undefined,
      mov_assignments: convertToTaskDto.mov_assignments,
    };

    const task = await this.tasksService.create(createTaskDto, currentUser);

    // Wrap DB consistency updates (source, related_task_id links) in a transaction
    const updated = await this.dataSource.transaction(async (manager: EntityManager) => {
      // Update task with source info
      const taskToUpdate = await manager.getRepository(Task).findOne({ where: { id: task.id } });
      let finalTask = task;
      if (taskToUpdate) {
        taskToUpdate.source = 'visitor';
        taskToUpdate.source_id = id;
        finalTask = await manager.getRepository(Task).save(taskToUpdate);
      }

      // Update the original entity with related task id
      entity.related_task_id = finalTask.id;
      const savedRecord = await manager.save(entity);

      // Update linked CeoNote's related_task_id (if any)
      if (entity.related_note_id) {
        const note = await manager.getRepository(CeoNote).findOne({
          where: { id: entity.related_note_id }
        });
        if (note) {
          note.related_task_id = finalTask.id;
          await manager.getRepository(CeoNote).save(note);
        }
      }

      return { task: finalTask, record: savedRecord };
    });

    // Send notifications (side effect, outside the transaction so DB state is committed first)
    const userIdsToNotify = createTaskDto.assigned_users;
    if (userIdsToNotify && userIdsToNotify.length > 0) {
      try {
        await this.notificationsService.create(
          {
            title: 'Visitor/Call/WhatsApp Converted to Task',
            message: `A new task has been created and assigned to you: ${title}`,
            type: NotificationType.INFO,
            link: `/tasks/${updated.task.id}`,
            metadata: {
              recordId: id,
              type: entity.type,
              taskId: updated.task.id,
            },
          },
          userIdsToNotify,
          currentUser,
        );
      } catch (notifyErr: any) {
        this.logger.warn(
          `Failed to send conversion notifications for record ${id}: ${notifyErr?.message}`,
        );
      }
    }

    return updated;
  }
}
