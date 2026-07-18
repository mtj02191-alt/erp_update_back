import {
  Injectable,
  NotFoundException,
  Logger,
  BadRequestException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
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

    // Create corresponding CeoNote first only if there isn't one already
    let ceoNote: CeoNote | null = null;
    if (!relatedNoteId) { // Only create new note if not already linked to one
      const noteCategory = type === "call" ? "calls" : type === "whatsapp" ? "whatsapp" : "visitors";
      const noteTitle = type === "call" 
        ? `Call with ${data.caller_name || "Unknown"}` 
        : type === "whatsapp" 
          ? `WhatsApp with ${data.contact_name || "Unknown"}`
          : `Visit from ${data.visitor_name || "Unknown"}`;
      const noteDetails = type === "call" 
        ? `Purpose: ${data.call_purpose || ""}\nSummary: ${data.call_summary || ""}`
        : type === "whatsapp"
          ? `Message Summary: ${data.message_summary || ""}\nRequired Action: ${data.required_action || ""}`
          : `Purpose: ${data.purpose || ""}\nOrganization: ${data.organization || ""}`;
      
      const ceoNoteData: Partial<CeoNote> = {
        date: this.safelyParseDate(data.visit_datetime) || new Date(),
        category: noteCategory as any,
        title: noteTitle,
        details: noteDetails,
        department: data.department || null,
        priority: "medium",
        due_date: type === "call" && data.follow_up_date ? this.safelyParseDate(data.follow_up_date) : null,
        status: CeoNoteStatus.UNPROCESSED,
        created_by_id: currentUser?.id || null,
      };
      ceoNote = this.ceoNoteRepository.create(ceoNoteData);
      ceoNote = await this.ceoNoteRepository.save(ceoNote);
    }

    let createdEntity: any;

    if (type === "call") {
      const callData: Partial<Call> = {
        ...data,
        related_note_id: ceoNote ? ceoNote.id : relatedNoteId,
        created_by_id: currentUser?.id || null,
        visit_datetime: this.safelyParseDate(data.visit_datetime) || new Date(),
        follow_up_date: this.safelyParseDate(data.follow_up_date),
      };
      const call = this.callRepository.create(callData);
      createdEntity = await this.callRepository.save(call);
    } else if (type === "whatsapp") {
      const whatsappData: Partial<WhatsAppMessage> = {
        ...data,
        related_note_id: ceoNote ? ceoNote.id : relatedNoteId,
        created_by_id: currentUser?.id || null,
        visit_datetime: this.safelyParseDate(data.visit_datetime) || new Date(),
      };
      const whatsapp = this.whatsappRepository.create(whatsappData);
      createdEntity = await this.whatsappRepository.save(whatsapp);
    } else {
      // Default to Visitor
      const visitorData: Partial<Visitor> = {
        ...data,
        related_note_id: ceoNote ? ceoNote.id : relatedNoteId,
        created_by_id: currentUser?.id || null,
        visit_datetime: this.safelyParseDate(data.visit_datetime) || new Date(),
      };
      const visitor = this.visitorRepository.create(visitorData);
      createdEntity = await this.visitorRepository.save(visitor);
    }

    return createdEntity;
  }

  async findAll(payload: any) {
    const page = +(payload?.pagination?.page || payload?.page || 1);
    const pageSize = +(
      payload?.pagination?.pageSize ||
      payload?.pageSize ||
      10
    );

    // Fetch all three types with related_note relation
    const [visitors, visitorsTotal] = await this.visitorRepository.findAndCount(
      {
        skip: (page - 1) * pageSize,
        take: pageSize,
        order: { visit_datetime: "DESC" },
        relations: ["related_note"],
      },
    );

    const [calls, callsTotal] = await this.callRepository.findAndCount({
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { visit_datetime: "DESC" },
      relations: ["related_note"],
    });

    const [whatsapps, whatsappsTotal] =
      await this.whatsappRepository.findAndCount({
        skip: (page - 1) * pageSize,
        take: pageSize,
        order: { visit_datetime: "DESC" },
        relations: ["related_note"],
      });

    // Combine all results
    const all = [...visitors, ...calls, ...whatsapps];
    // Sort by visit_datetime descending
    all.sort(
      (a, b) =>
        new Date(b.visit_datetime).getTime() -
        new Date(a.visit_datetime).getTime(),
    );

    // For each record, if related_task_id is null but related_note has related_task_id, use that
    const processed = all.map(record => {
      if (!record.related_task_id && record.related_note?.related_task_id) {
        return {
          ...record,
          related_task_id: record.related_note.related_task_id
        };
      }
      return record;
    });

    const total = visitorsTotal + callsTotal + whatsappsTotal;

    return {
      data: processed,
      total,
      page,
      pageSize,
      totalPages: pageSize === -1 ? 1 : Math.ceil(total / pageSize),
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
        if (call) return call;
      }
      if (t === "whatsapp") {
        const whatsapp = await this.whatsappRepository.findOne({
          where: { id },
          relations: ["created_by", "related_note", "related_task"],
        });
        if (whatsapp) return whatsapp;
      }
      const visitor = await this.visitorRepository.findOne({
        where: { id },
        relations: ["created_by", "related_note", "related_task"],
      });
      if (visitor) return visitor;
    }

    // If no type specified, try all
    let entity: any = await this.visitorRepository.findOne({
      where: { id },
      relations: ["created_by", "related_note", "related_task"],
    });
    if (entity) return entity;

    entity = await this.callRepository.findOne({
      where: { id },
      relations: ["created_by", "related_note", "related_task"],
    });
    if (entity) return entity;

    entity = await this.whatsappRepository.findOne({
      where: { id },
      relations: ["created_by", "related_note", "related_task"],
    });
    if (entity) return entity;

    throw new NotFoundException(`Record with ID ${id} not found`);
  }

  async update(id: number, data: any, currentUser: User) {
    const type = (data.type || "visitor").toLowerCase();
    const relatedNoteId =
      data.related_note_id !== undefined
        ? await this.validateRelatedNoteId(data.related_note_id)
        : undefined;

    let updatedEntity: any;
    let linkedNoteId: number | null = null;

    if (type === "call") {
      const call = await this.callRepository.findOne({ where: { id } });
      if (!call) throw new NotFoundException(`Call with ID ${id} not found`);

      const updateData: Partial<Call> = {
        ...data,
        related_note_id:
          relatedNoteId !== undefined ? relatedNoteId : call.related_note_id,
      };
      if (data.visit_datetime !== undefined)
        updateData.visit_datetime = this.safelyParseDate(data.visit_datetime);
      if (data.follow_up_date !== undefined)
        updateData.follow_up_date = this.safelyParseDate(data.follow_up_date);

      Object.assign(call, updateData);
      updatedEntity = await this.callRepository.save(call);
      linkedNoteId = updatedEntity.related_note_id;
    } else if (type === "whatsapp") {
      const whatsapp = await this.whatsappRepository.findOne({ where: { id } });
      if (!whatsapp)
        throw new NotFoundException(`WhatsApp with ID ${id} not found`);

      const updateData: Partial<WhatsAppMessage> = {
        ...data,
        related_note_id:
          relatedNoteId !== undefined
            ? relatedNoteId
            : whatsapp.related_note_id,
      };
      if (data.visit_datetime !== undefined)
        updateData.visit_datetime = this.safelyParseDate(data.visit_datetime);

      Object.assign(whatsapp, updateData);
      updatedEntity = await this.whatsappRepository.save(whatsapp);
      linkedNoteId = updatedEntity.related_note_id;
    } else {
      // Default to Visitor
      const visitor = await this.visitorRepository.findOne({ where: { id } });
      if (!visitor)
        throw new NotFoundException(`Visitor with ID ${id} not found`);

      const updateData: Partial<Visitor> = {
        ...data,
        related_note_id:
          relatedNoteId !== undefined ? relatedNoteId : visitor.related_note_id,
      };
      if (data.visit_datetime !== undefined)
        updateData.visit_datetime = this.safelyParseDate(data.visit_datetime);

      Object.assign(visitor, updateData);
      updatedEntity = await this.visitorRepository.save(visitor);
      linkedNoteId = updatedEntity.related_note_id;
    }

    // Update linked CeoNote if it exists
    if (linkedNoteId) {
      const note = await this.ceoNoteRepository.findOne({ where: { id: linkedNoteId } });
      if (note) {
        if (type === "call") {
          note.related_person = data.caller_name || note.related_person;
          note.details = data.call_purpose ? `Purpose: ${data.call_purpose}\nSummary: ${data.call_summary || ""}` : note.details;
          note.due_date = data.follow_up_date ? this.safelyParseDate(data.follow_up_date) : note.due_date;
          note.date = data.visit_datetime ? this.safelyParseDate(data.visit_datetime) : note.date;
        } else if (type === "whatsapp") {
          note.related_person = data.contact_name || note.related_person;
          note.details = data.message_summary ? `Message Summary: ${data.message_summary}\nRequired Action: ${data.required_action || ""}` : note.details;
          note.date = data.visit_datetime ? this.safelyParseDate(data.visit_datetime) : note.date;
        } else { // Visitor
          note.related_person = data.visitor_name || note.related_person;
          note.details = data.purpose ? `Purpose: ${data.purpose}\nOrganization: ${data.organization || ""}` : note.details;
          note.date = data.visit_datetime ? this.safelyParseDate(data.visit_datetime) : note.date;
        }
        await this.ceoNoteRepository.save(note);
      }
    }

    return updatedEntity;
  }

  async remove(id: number, type?: string) {
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

    // Delete linked CeoNote if it exists
    if (entity.related_note_id) {
      const note = await this.ceoNoteRepository.findOne({ where: { id: entity.related_note_id } });
      if (note) {
        await this.ceoNoteRepository.remove(note);
      }
    }

    // Delete the entity itself
    await repository.remove(entity);
    
    // Return appropriate message
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
    };

    const task = await this.tasksService.create(createTaskDto, currentUser);

    // Update task with source info
    const taskToUpdate = await this.taskRepository.findOne({ where: { id: task.id } });
    if (taskToUpdate) {
      taskToUpdate.source = 'visitor';
      taskToUpdate.source_id = id;
      await this.taskRepository.save(taskToUpdate);
    }

    // Update the original entity with related task id
    entity.related_task_id = task.id;
    await repository.save(entity);
    
    // Update linked CeoNote's related_task_id (if any)
    if (entity.related_note_id) {
      const note = await this.ceoNoteRepository.findOne({
        where: { id: entity.related_note_id }
      });
      if (note) {
        note.related_task_id = task.id;
        await this.ceoNoteRepository.save(note);
      }
    }

    // Send notifications
    const userIdsToNotify = createTaskDto.assigned_users;
    if (userIdsToNotify && userIdsToNotify.length > 0) {
      await this.notificationsService.create(
        {
          title: 'Visitor/Call/WhatsApp Converted to Task',
          message: `A new task has been created and assigned to you: ${title}`,
          type: NotificationType.INFO,
          link: `/tasks/${task.id}`,
          metadata: {
            recordId: id,
            type: entity.type,
            taskId: task.id,
          },
        },
        userIdsToNotify,
        currentUser,
      );
    }

    return { task, record: entity };
  }
}
