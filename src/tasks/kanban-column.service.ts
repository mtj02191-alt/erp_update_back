import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { KanbanColumn, ColumnType } from "./entities/kanban-column.entity";
import { CreateKanbanColumnDto } from "./dto/create-kanban-column.dto";
import { UpdateKanbanColumnDto } from "./dto/update-kanban-column.dto";
import { ReorderKanbanColumnsDto } from "./dto/reorder-kanban-columns.dto";
import { Task, TaskStatus } from "./entities/task.entity";
import { User } from "../users/user.entity";

const DEFAULT_COLUMNS = [
  { name: "Open", status: "open", order: 0 },
  { name: "In Progress", status: "in_progress", order: 1 },
  { name: "Blocked", status: "blocked", order: 2 },
  { name: "Pending Approval", status: "pending_approval", order: 3 },
  { name: "Approved", status: "approved", order: 4 },
  { name: "Rejected", status: "rejected", order: 5 },
  { name: "Completed", status: "completed", order: 6 },
  { name: "Closed", status: "closed", order: 7 },
  { name: "Cancelled", status: "cancelled", order: 8 },
];

@Injectable()
export class KanbanColumnService {
  private readonly logger = new Logger(KanbanColumnService.name);

  constructor(
    @InjectRepository(KanbanColumn)
    private readonly kanbanColumnRepo: Repository<KanbanColumn>,
    @InjectRepository(Task)
    private readonly taskRepo: Repository<Task>,
  ) {}

  async initializeDefaultColumns(): Promise<void> {
    try {
      this.logger.log("Initializing default kanban columns...");
      for (const col of DEFAULT_COLUMNS) {
        const existing = await this.kanbanColumnRepo.findOne({
          where: { status: col.status as any },
        });
        if (!existing) {
          this.logger.log("Creating default column: " + col.name);
          const newCol = this.kanbanColumnRepo.create({
            name: col.name,
            status: col.status as any,
            type: ColumnType.DEFAULT,
            order: col.order,
          });
          await this.kanbanColumnRepo.save(newCol);
        }
      }
      this.logger.log("Default kanban columns initialized successfully");
    } catch (error) {
      this.logger.warn(
        "Kanban columns table may not exist yet, skipping initialization",
      );
    }
  }

  async findAll(): Promise<KanbanColumn[]> {
    this.logger.log("Fetching all kanban columns");
    try {
      await this.initializeDefaultColumns();
      const columns = await this.kanbanColumnRepo.find({
        order: { order: "ASC", createdAt: "ASC" },
      });
      this.logger.log("Found " + columns.length + " kanban columns");
      return columns;
    } catch (error) {
      this.logger.warn(
        "Returning default columns because kanban_columns table does not exist yet",
      );
      // Return default columns as objects if table not ready
      return DEFAULT_COLUMNS.map((col, index) => ({
        id: index + 1,
        name: col.name,
        status: col.status,
        type: "default",
        order: col.order,
        createdAt: new Date(),
        updatedAt: new Date(),
      })) as any;
    }
  }

  async findOne(id: number): Promise<KanbanColumn> {
    const column = await this.kanbanColumnRepo.findOne({ where: { id } });
    if (!column) {
      throw new NotFoundException("Kanban column with ID " + id + " not found");
    }
    return column;
  }

  async create(
    dto: CreateKanbanColumnDto,
    currentUser: User,
  ): Promise<KanbanColumn> {
    let status = dto.status;
    if (!status) {
      status = dto.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_|_$/g, "");
      let counter = 1;
      let uniqueStatus = status;
      while (
        await this.kanbanColumnRepo.findOne({
          where: { status: uniqueStatus as any },
        })
      ) {
        uniqueStatus = status + "_" + counter;
        counter++;
      }
      status = uniqueStatus;
    } else {
      const exists = await this.kanbanColumnRepo.findOne({
        where: { status: status as any },
      });
      if (exists) {
        throw new ConflictException("Status " + status + " already exists");
      }
    }

    const maxOrderResult = await this.kanbanColumnRepo
      .createQueryBuilder("c")
      .select("MAX(c.order)", "max")
      .getRawOne();
    const nextOrder =
      maxOrderResult && maxOrderResult.max !== null
        ? Number(maxOrderResult.max) + 1
        : 0;

    const column = this.kanbanColumnRepo.create({
      name: dto.name,
      status: status as any,
      type: ColumnType.CUSTOM,
      order: dto.order !== undefined ? dto.order : nextOrder,
      createdById: currentUser.id,
    });

    return await this.kanbanColumnRepo.save(column);
  }

  async update(id: number, dto: UpdateKanbanColumnDto): Promise<KanbanColumn> {
    const column = await this.findOne(id);

    if (dto.status && dto.status !== column.status) {
      const existing = await this.kanbanColumnRepo.findOne({
        where: { status: dto.status as any },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(
          "Status " + dto.status + " is already in use",
        );
      }

      await this.taskRepo
        .createQueryBuilder()
        .update(Task)
        .set({ status: dto.status as TaskStatus })
        .where("status = :oldStatus", { oldStatus: column.status as any })
        .execute();
    }

    Object.assign(column, dto);
    return await this.kanbanColumnRepo.save(column);
  }

  async reorder(dto: ReorderKanbanColumnsDto): Promise<void> {
    for (const columnData of dto.columns) {
      await this.kanbanColumnRepo.update(columnData.id, {
        order: columnData.order,
      });
    }
  }

  async remove(id: number, force = false): Promise<void> {
    const column = await this.findOne(id);

    if (column.type === ColumnType.DEFAULT) {
      throw new ConflictException("Default kanban columns cannot be deleted");
    }

    const taskCount = await this.taskRepo.count({
      where: { status: column.status as any },
    });

    if (taskCount > 0 && !force) {
      throw new ConflictException(
        "Kanban column has " +
          taskCount +
          " tasks. Use force=true to delete and move tasks to To Do",
      );
    }

    if (taskCount > 0 && force) {
      await this.taskRepo
        .createQueryBuilder()
        .update(Task)
        .set({ status: TaskStatus.OPEN })
        .where("status = :oldStatus", { oldStatus: column.status as any })
        .execute();
    }

    await this.kanbanColumnRepo.remove(column);
  }
}
