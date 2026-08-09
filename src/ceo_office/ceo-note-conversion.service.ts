import { Injectable, BadRequestException, Logger } from "@nestjs/common";
import { EntityManager, In } from "typeorm";
import { CeoNote, CeoNoteStatus } from "./entities/ceo-note.entity";
import { User, Department } from "../users/user.entity";
import { Task, TaskPriority, TaskWorkflowType, TaskType } from "../tasks/entities/task.entity";
import { CeoNoteAuditService } from "./ceo-note-audit.service";
import { EventEmitter2 } from "@nestjs/event-emitter";
import { CeoNoteCategoryService } from "./ceo-note-category.service";

@Injectable()
export class CeoNoteConversionService {
  private readonly logger = new Logger(CeoNoteConversionService.name);

  constructor(
    private readonly auditService: CeoNoteAuditService,
    private readonly eventEmitter: EventEmitter2,
    private readonly categoryService: CeoNoteCategoryService,
  ) {}

  private async getAssignedUsersMeta(
    manager: EntityManager,
    userIds?: number[],
  ): Promise<{ user_id: number; department: Department; name: string }[] | null> {
    if (!Array.isArray(userIds) || userIds.length === 0) {
      return null;
    }
    const numericUserIds = userIds.map((id) => Number(id)).filter((id) => !isNaN(id));
    if (numericUserIds.length === 0) {
      return null;
    }
    const users = await manager.getRepository(User).find({ where: { id: In(numericUserIds) } });
    return users.map((u) => ({
      user_id: u.id,
      department: u.department,
      name: `${u.first_name || ""} ${u.last_name || ""}`.trim() || u.email || `User #${u.id}`,
    }));
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

  async convertToTask(
    manager: EntityManager,
    note: CeoNote,
    convertToTaskDto: any,
    currentUser: User,
  ) {
    if (!note) {
      throw new BadRequestException("Note does not exist");
    }

    const title = convertToTaskDto.task_title || note.title;
    const description = convertToTaskDto.task_description || note.details || "";
    const department =
      convertToTaskDto.task_department || note.department || Department.ADMIN;
    const priority =
      convertToTaskDto.task_priority || this.mapPriority(note.priority);
    const due_date = convertToTaskDto.task_due_date
      ? new Date(convertToTaskDto.task_due_date)
      : note.due_date || null;
    const assignedUsers =
      convertToTaskDto.assigned_users || note.assigned_user_ids || [];

    const assignedUsersMeta = await this.getAssignedUsersMeta(manager, assignedUsers);
    const taskRepository = manager.getRepository(Task);

    const task = taskRepository.create({
      title,
      description,
      department,
      priority,
      workflow_type: TaskWorkflowType.STANDARD,
      task_type: TaskType.ONE_TIME,
      due_date,
      assigned_user_ids: assignedUsers.length > 0 ? assignedUsers : null,
      assigned_users_meta: assignedUsersMeta,
      mov_items: Array.isArray(convertToTaskDto.mov_items)
        ? convertToTaskDto.mov_items.filter((item) => !!item)
        : null,
      created_by_id: currentUser?.id || null,
      source: "ceo_note",
      source_id: note.id,
    });

    const savedTask = await taskRepository.save(task);

    const oldValue = { ...note };
    note.related_task_id = savedTask.id;
    note.status = note.status === "approved" ? note.status : CeoNoteStatus.IN_PROGRESS;
    if (convertToTaskDto.assigned_users !== undefined) {
      note.assigned_user_ids = assignedUsers;
    }
    const savedNote = await manager.getRepository(CeoNote).save(note);

    await this.auditService.log(
      savedNote,
      currentUser,
      "converted_to_task",
      oldValue,
      { note: savedNote, task_id: savedTask.id },
      manager,
    );

    // Sync category record status after conversion
    try {
      await this.categoryService.updateCategoryRecord(manager, savedNote, { status: savedNote.status });
    } catch (err) {
      this.logger.warn(`Category sync after conversion failed for note ${savedNote.id}: ${err?.message || String(err)}`);
    }

    try {
      this.eventEmitter.emit("task.created", {
        title: "CEO Note Converted to Task",
        message: `A task for note \"${savedNote.title}\" has been created.`,
        link: `/tasks/${savedTask.id}`,
        metadata: {
          noteId: savedNote.id,
          taskId: savedTask.id,
        },
        userIds: assignedUsers,
        user: currentUser,
      });
    } catch (eventErr: any) {
      this.logger.warn(`task.created emit failed: ${eventErr?.message}`);
    }

    try {
      this.eventEmitter.emit("ceo_note.converted_to_task", {
        title: "CEO Note Converted to Task",
        message: `CEO note \"${savedNote.title}\" was converted to a task.`,
        link: `/ceo-office/notes/${savedNote.id}`,
        metadata: {
          noteId: savedNote.id,
          taskId: savedTask.id,
        },
        userIds: assignedUsers,
        user: currentUser,
      });
    } catch (eventErr: any) {
      this.logger.warn(`ceo_note.converted_to_task emit failed: ${eventErr?.message}`);
    }

    return { note: savedNote, task: savedTask };
  }
}
