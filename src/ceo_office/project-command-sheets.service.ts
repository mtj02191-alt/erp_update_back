import { Injectable, NotFoundException, Logger, BadRequestException } from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, SelectQueryBuilder } from "typeorm";
import { ProjectCommandSheet } from "./entities/project-command-sheet.entity";
import { CreateProjectCommandSheetDto } from "./dto/create-project-command-sheet.dto";
import { UpdateProjectCommandSheetDto } from "./dto/update-project-command-sheet.dto";
import { ConvertToTaskDto } from "./dto/convert-to-task.dto";
import { User, Department } from "../users/user.entity";
import { TasksService } from "../tasks/tasks.service";
import { CreateTaskDto } from "../tasks/dto/create-task.dto";
import {
  Task,
  TaskWorkflowType,
  TaskType,
  TaskPriority,
} from "../tasks/entities/task.entity";
import { NotificationsService } from "../notifications/notifications.service";
import { NotificationType } from "../notifications/entities/notification.entity";

@Injectable()
export class ProjectCommandSheetsService {
  private readonly logger = new Logger(ProjectCommandSheetsService.name);

  constructor(
    @InjectRepository(ProjectCommandSheet)
    private readonly projectCommandSheetRepository: Repository<ProjectCommandSheet>,
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    private readonly tasksService: TasksService,
    private readonly notificationsService: NotificationsService,
  ) {}

  async create(
    createProjectCommandSheetDto: CreateProjectCommandSheetDto,
    currentUser: User,
  ) {
    const sheetData: Partial<ProjectCommandSheet> = {
      ...createProjectCommandSheetDto,
      created_by_id: currentUser?.id || null,
      pending_items: createProjectCommandSheetDto.pending_items?.map(
        (item, idx) => ({
          id: `pending-${Date.now()}-${idx}`,
          text: item.text,
          status: "pending" as const,
          created_at: new Date(),
        }),
      ),
      action_items: createProjectCommandSheetDto.action_items?.map(
        (item, idx) => ({
          id: `action-${Date.now()}-${idx}`,
          text: item.text,
          assigned_to_id: item.assigned_to_id,
          due_date: item.due_date ? new Date(item.due_date) : null,
          status: "pending" as const,
        }),
      ),
    };
    const sheet = this.projectCommandSheetRepository.create(sheetData);
    return await this.projectCommandSheetRepository.save(sheet);
  }

  async findAll(payload: any) {
    const page = +(payload?.pagination?.page || payload?.page || 1);
    const pageSize = +(
      payload?.pagination?.pageSize ||
      payload?.pageSize ||
      10
    );
    const qb = this.projectCommandSheetRepository.createQueryBuilder("sheet");
    const skip = (page - 1) * pageSize;
    if (pageSize !== -1) {
      qb.skip(skip).take(pageSize);
    }
    qb.orderBy("sheet.created_at", "DESC");
    const [data, total] = await qb.getManyAndCount();
    return {
      data,
      total,
      page,
      pageSize,
      totalPages: pageSize === -1 ? 1 : Math.ceil(total / pageSize),
    };
  }

  async findOne(id: number) {
    const sheet = await this.projectCommandSheetRepository.findOne({
      where: { id },
      relations: ["created_by"],
    });
    if (!sheet) {
      throw new NotFoundException(
        `Project command sheet with ID ${id} not found`,
      );
    }
    return sheet;
  }

  async update(
    id: number,
    updateProjectCommandSheetDto: UpdateProjectCommandSheetDto,
    currentUser: User,
  ) {
    const sheet = await this.findOne(id);
    Object.assign(sheet, updateProjectCommandSheetDto);
    return await this.projectCommandSheetRepository.save(sheet);
  }

  async remove(id: number) {
    const sheet = await this.findOne(id);
    await this.projectCommandSheetRepository.remove(sheet);
    return { message: "Sheet deleted successfully" };
  }

  async convertActionItemToTask(
    sheetId: number,
    actionItemId: string,
    convertToTaskDto: ConvertToTaskDto,
    currentUser: User,
  ) {
    const sheet = await this.findOne(sheetId);
    const actionItem = sheet.action_items?.find(
      (item) => item.id === actionItemId,
    );
    if (!actionItem) {
      throw new NotFoundException("Action item not found");
    }

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
      title: convertToTaskDto.task_title || actionItem.text,
      description:
        convertToTaskDto.task_description ||
        `From project command sheet: ${sheet.project_name}`,
      department: convertToTaskDto.task_department || Department.ADMIN,
      priority: convertToTaskDto.task_priority || TaskPriority.MEDIUM,
      due_date:
        convertToTaskDto.task_due_date || formatDate(actionItem.due_date),
      assigned_users:
        convertToTaskDto.assigned_users ||
        (actionItem.assigned_to_id ? [actionItem.assigned_to_id] : []),
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

    // Set source and source_id on task
    const taskToUpdate = await this.taskRepository.findOne({
      where: { id: task.id },
    });
    if (taskToUpdate) {
      taskToUpdate.source = "project_command_sheet_action_item";
      taskToUpdate.source_id = sheetId;
      await this.taskRepository.save(taskToUpdate);
    }

    // Update action item with related task id
    const updatedActionItems = sheet.action_items?.map((item) => {
      if (item.id === actionItemId) {
        return {
          ...item,
          related_task_id: task.id,
          status: "in_progress" as const,
        };
      }
      return item;
    });
    sheet.action_items = updatedActionItems;
    await this.projectCommandSheetRepository.save(sheet);

    // Send notification to assigned users
    const userIdsToNotify = createTaskDto.assigned_users;
    if (userIdsToNotify && userIdsToNotify.length > 0) {
      await this.notificationsService.create(
        {
          title: "Project Command Sheet Action Item Converted to Task",
          message: `Action item "${actionItem.text}" from project "${sheet.project_name}" has been converted to a task and assigned to you.`,
          type: NotificationType.INFO,
          link: `/tasks/${task.id}`,
          metadata: {
            sheetId: sheetId,
            actionItemId: actionItemId,
            taskId: task.id,
          },
        },
        userIdsToNotify,
        currentUser,
      );
    }

    return { task, sheet };
  }

  async convertSheetToTask(
    sheetId: number,
    convertToTaskDto: ConvertToTaskDto,
    currentUser: User,
  ) {
    const sheet = await this.findOne(sheetId);
    if (sheet.related_task_id) {
      throw new BadRequestException("Sheet already converted to task");
    }

    const createTaskDto: CreateTaskDto = {
      title: convertToTaskDto.task_title || sheet.project_name,
      description:
        convertToTaskDto.task_description ||
        `From project command sheet: ${sheet.project_name}`,
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

    // Set source and source_id on task
    const taskToUpdate = await this.taskRepository.findOne({
      where: { id: task.id },
    });
    if (taskToUpdate) {
      taskToUpdate.source = "project_command_sheet";
      taskToUpdate.source_id = sheetId;
      await this.taskRepository.save(taskToUpdate);
    }

    // Update sheet with related task id
    sheet.related_task_id = task.id;
    await this.projectCommandSheetRepository.save(sheet);

    // Send notification to assigned users
    const userIdsToNotify = createTaskDto.assigned_users;
    if (userIdsToNotify && userIdsToNotify.length > 0) {
      await this.notificationsService.create(
        {
          title: "Project Command Sheet Converted to Task",
          message: `Project "${sheet.project_name}" has been converted to a task and assigned to you.`,
          type: NotificationType.INFO,
          link: `/tasks/${task.id}`,
          metadata: {
            sheetId: sheetId,
            taskId: task.id,
          },
        },
        userIdsToNotify,
        currentUser,
      );
    }

    return { task, sheet };
  }
}
