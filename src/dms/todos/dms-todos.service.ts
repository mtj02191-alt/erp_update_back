import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository, SelectQueryBuilder } from "typeorm";
import {
  DmsTodo,
  DmsTodoPriority,
  DmsTodoRecurrenceEndType,
  DmsTodoRecurrenceRule,
  DmsTodoRelatedType,
  DmsTodoStatus,
} from "./entities/dms-todo.entity";
import { CreateDmsTodoDto } from "./dto/create-dms-todo.dto";
import { UpdateDmsTodoDto } from "./dto/update-dms-todo.dto";
import { DonationBox } from "../donation_box/entities/donation-box.entity";
import { User } from "../../users/user.entity";

interface ListOptions {
  page: number;
  pageSize: number;
  sortField?: string;
  sortOrder?: "ASC" | "DESC";
  search?: string;
  status?: string;
  priority?: string;
  related_type?: string;
  related_id?: number;
  assigned_to_id?: number;
  due_date?: string;
  start_date?: string;
  end_date?: string;
  is_recurring?: boolean;
  mine_only?: boolean;
}

@Injectable()
export class DmsTodosService {
  constructor(
    @InjectRepository(DmsTodo)
    private readonly todoRepository: Repository<DmsTodo>,
    @InjectRepository(DonationBox)
    private readonly donationBoxRepository: Repository<DonationBox>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  getNextOccurrence(date: Date, rule: string): Date {
    const next = new Date(date);
    const ruleLower = (rule || "").toLowerCase();

    if (ruleLower === DmsTodoRecurrenceRule.DAILY || ruleLower === "daily") {
      next.setDate(next.getDate() + 1);
    } else if (
      ruleLower === DmsTodoRecurrenceRule.WEEKLY ||
      ruleLower === "weekly"
    ) {
      next.setDate(next.getDate() + 7);
    } else if (
      ruleLower === DmsTodoRecurrenceRule.BI_WEEKLY ||
      ruleLower === "bi_weekly" ||
      ruleLower === "bi-weekly"
    ) {
      next.setDate(next.getDate() + 14);
    } else if (
      ruleLower === DmsTodoRecurrenceRule.MONTHLY ||
      ruleLower === "monthly"
    ) {
      next.setMonth(next.getMonth() + 1);
    } else if (
      ruleLower === DmsTodoRecurrenceRule.QUARTERLY ||
      ruleLower === "quarterly"
    ) {
      next.setMonth(next.getMonth() + 3);
    } else if (
      ruleLower === DmsTodoRecurrenceRule.ANNUALLY ||
      ruleLower === "annually"
    ) {
      next.setFullYear(next.getFullYear() + 1);
    } else {
      next.setDate(next.getDate() + 7);
    }
    return next;
  }

  private toDateOnlyString(d: Date): string {
    return d.toISOString().slice(0, 10);
  }

  /** Calendar date in Asia/Karachi (YYYY-MM-DD). */
  private todayInKarachi(): string {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Karachi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  }

  private baseQuery(): SelectQueryBuilder<DmsTodo> {
    return this.todoRepository
      .createQueryBuilder("todo")
      .where("todo.is_archived = :archived", { archived: false });
  }

  private applyListFilters(
    query: SelectQueryBuilder<DmsTodo>,
    options: ListOptions,
    currentUserId?: number,
  ): void {
    if (options.mine_only && currentUserId) {
      query.andWhere("todo.assigned_to_id = :mineUserId", {
        mineUserId: currentUserId,
      });
    } else if (options.assigned_to_id) {
      query.andWhere("todo.assigned_to_id = :assigned_to_id", {
        assigned_to_id: options.assigned_to_id,
      });
    }

    if (options.status) {
      query.andWhere("todo.status = :status", { status: options.status });
    }
    if (options.priority) {
      query.andWhere("todo.priority = :priority", {
        priority: options.priority,
      });
    }
    if (options.related_type) {
      query.andWhere("todo.related_type = :related_type", {
        related_type: options.related_type,
      });
    }
    if (options.related_id) {
      query.andWhere("todo.related_id = :related_id", {
        related_id: options.related_id,
      });
    }
    if (options.is_recurring === true) {
      query.andWhere("todo.is_recurring = true");
    } else if (options.is_recurring === false) {
      query.andWhere("todo.is_recurring = false");
    }
    if (options.due_date) {
      query.andWhere("todo.due_date = :due_date", {
        due_date: options.due_date,
      });
    }
    if (options.start_date) {
      query.andWhere("todo.due_date >= :start_date", {
        start_date: options.start_date,
      });
    }
    if (options.end_date) {
      query.andWhere("todo.due_date <= :end_date", {
        end_date: options.end_date,
      });
    }
    if (options.search?.trim()) {
      const term = `%${options.search.trim()}%`;
      query.andWhere(
        `(todo.title ILIKE :term
          OR todo.notes ILIKE :term
          OR CAST(todo.related_meta AS text) ILIKE :term)`,
        { term },
      );
    }
  }

  private serialize(todo: DmsTodo) {
    return {
      id: todo.id,
      title: todo.title,
      notes: todo.notes,
      priority: todo.priority,
      status: todo.status,
      due_date: todo.due_date,
      completed_at: todo.completed_at,
      assigned_to_id: todo.assigned_to_id,
      related_type: todo.related_type,
      related_id: todo.related_id,
      related_meta: todo.related_meta,
      is_recurring: todo.is_recurring,
      recurrence_rule: todo.recurrence_rule,
      recurrence_end_type: todo.recurrence_end_type,
      recurrence_end_date: todo.recurrence_end_date,
      recurrence_end_occurrences: todo.recurrence_end_occurrences,
      recurrence_completed_count: todo.recurrence_completed_count,
      recurrence_next_spawned: todo.recurrence_next_spawned,
      parent_id: todo.parent_id,
      created_at: todo.created_at,
      updated_at: todo.updated_at,
      assigned_to: todo.assigned_to
        ? {
            id: todo.assigned_to.id,
            name: (todo.assigned_to as any).name,
            email: (todo.assigned_to as any).email,
          }
        : null,
      created_by: todo.created_by
        ? {
            id: (todo.created_by as any).id,
            name: (todo.created_by as any).name,
          }
        : null,
    };
  }

  private async resolveRelatedMeta(
    relatedType: DmsTodoRelatedType | undefined,
    relatedId: number | undefined | null,
    provided?: Record<string, unknown> | null,
  ): Promise<Record<string, unknown> | null> {
    if (provided && Object.keys(provided).length) {
      return provided;
    }
    if (
      !relatedType ||
      relatedType === DmsTodoRelatedType.NONE ||
      !relatedId
    ) {
      return null;
    }

    if (relatedType === DmsTodoRelatedType.DONATION_BOX) {
      const box = await this.donationBoxRepository.findOne({
        where: { id: relatedId, is_archived: false },
        relations: ["route"],
      });
      if (!box) {
        throw new NotFoundException("Related donation box not found");
      }
      return {
        label: box.shop_name,
        subtitle: box.shopkeeper || null,
        box_id_no: box.box_id_no,
        address:
          box.address ||
          box.landmark_marketplace ||
          (box.route as any)?.name ||
          null,
        landmark_marketplace: box.landmark_marketplace,
        shopkeeper: box.shopkeeper,
        cell_no: box.cell_no,
      };
    }

    return provided || { label: `#${relatedId}` };
  }

  private shouldSpawnNext(todo: DmsTodo, completedCountAfter: number): boolean {
    if (!todo.is_recurring || !todo.recurrence_rule) return false;
    if (todo.recurrence_next_spawned) return false;

    const endType =
      todo.recurrence_end_type || DmsTodoRecurrenceEndType.NEVER;

    if (endType === DmsTodoRecurrenceEndType.AFTER_OCCURRENCES) {
      const max = todo.recurrence_end_occurrences || 0;
      return completedCountAfter < max;
    }

    if (endType === DmsTodoRecurrenceEndType.ON_DATE) {
      if (!todo.recurrence_end_date) return true;
      const base = todo.due_date ? new Date(todo.due_date) : new Date();
      const nextDue = this.getNextOccurrence(base, todo.recurrence_rule);
      const end = new Date(todo.recurrence_end_date);
      return this.toDateOnlyString(nextDue) <= this.toDateOnlyString(end);
    }

    return true;
  }

  private seriesRootId(todo: DmsTodo): number {
    return todo.parent_id || todo.id;
  }

  private async seriesOccurrenceCount(rootId: number): Promise<number> {
    return this.todoRepository
      .createQueryBuilder("todo")
      .where("todo.is_archived = false")
      .andWhere("(todo.id = :rootId OR todo.parent_id = :rootId)", { rootId })
      .getCount();
  }

  private async findExistingOccurrenceForDue(
    rootId: number,
    dueDateStr: string,
  ): Promise<DmsTodo | null> {
    return this.todoRepository
      .createQueryBuilder("todo")
      .where("todo.is_archived = false")
      .andWhere("(todo.id = :rootId OR todo.parent_id = :rootId)", { rootId })
      .andWhere("todo.due_date = :dueDate", { dueDate: dueDateStr })
      .getOne();
  }

  /**
   * Create the next occurrence for a recurring todo if allowed and not already created.
   * Used by Mark as Done and the due-date cron.
   */
  async spawnNextOccurrence(
    todo: DmsTodo,
    actorUserId: number | null,
    options?: { fromCron?: boolean },
  ): Promise<DmsTodo | null> {
    if (!todo.is_recurring || !todo.recurrence_rule || !todo.due_date) {
      return null;
    }
    if (todo.recurrence_next_spawned) {
      return null;
    }

    const rootId = this.seriesRootId(todo);
    const endType =
      todo.recurrence_end_type || DmsTodoRecurrenceEndType.NEVER;

    // Cron / due-date spawn: limit AFTER_OCCURRENCES by series length (includes unfinished).
    // Complete path still uses completed count via shouldSpawnNext.
    if (options?.fromCron) {
      if (endType === DmsTodoRecurrenceEndType.AFTER_OCCURRENCES) {
        const max = todo.recurrence_end_occurrences || 0;
        const count = await this.seriesOccurrenceCount(rootId);
        if (count >= max) return null;
      }
    } else if (
      !this.shouldSpawnNext(todo, todo.recurrence_completed_count || 0)
    ) {
      return null;
    }

    if (endType === DmsTodoRecurrenceEndType.ON_DATE) {
      if (!this.shouldSpawnNext(todo, todo.recurrence_completed_count || 0)) {
        return null;
      }
    }

    const baseDue = new Date(todo.due_date);
    const nextDue = this.getNextOccurrence(baseDue, todo.recurrence_rule);
    const nextDueStr = this.toDateOnlyString(nextDue);

    if (endType === DmsTodoRecurrenceEndType.ON_DATE && todo.recurrence_end_date) {
      if (nextDueStr > this.toDateOnlyString(new Date(todo.recurrence_end_date))) {
        return null;
      }
    }

    const existing = await this.findExistingOccurrenceForDue(rootId, nextDueStr);
    if (existing) {
      todo.recurrence_next_spawned = true;
      await this.todoRepository.save(todo);
      return existing;
    }

    const spawn = this.todoRepository.create({
      title: todo.title,
      notes: todo.notes,
      priority: todo.priority,
      status: DmsTodoStatus.PENDING,
      due_date: nextDueStr as any,
      assigned_to_id: todo.assigned_to_id,
      related_type: todo.related_type,
      related_id: todo.related_id,
      related_meta: todo.related_meta,
      is_recurring: true,
      recurrence_rule: todo.recurrence_rule,
      recurrence_end_type: todo.recurrence_end_type,
      recurrence_end_date: todo.recurrence_end_date,
      recurrence_end_occurrences: todo.recurrence_end_occurrences,
      recurrence_completed_count: todo.recurrence_completed_count || 0,
      recurrence_next_spawned: false,
      parent_id: rootId,
      created_by: actorUserId ? ({ id: actorUserId } as User) : todo.created_by,
      updated_by: actorUserId ? ({ id: actorUserId } as User) : null,
    });

    const savedNext = await this.todoRepository.save(spawn);
    todo.recurrence_next_spawned = true;
    await this.todoRepository.save(todo);
    return savedNext;
  }

  /**
   * When a recurring todo's due date has arrived (due_date <= today),
   * create the next occurrence even if the current one is still pending.
   */
  async processDueRecurringTodos(asOfDate?: string): Promise<{
    scanned: number;
    spawned: number;
    skipped: number;
    todo_ids: number[];
  }> {
    const todayStr = asOfDate || this.todayInKarachi();

    const dueTodos = await this.todoRepository
      .createQueryBuilder("todo")
      .where("todo.is_archived = false")
      .andWhere("todo.is_recurring = true")
      .andWhere("todo.recurrence_rule IS NOT NULL")
      .andWhere("todo.due_date IS NOT NULL")
      .andWhere("todo.due_date <= :today", { today: todayStr })
      .andWhere("todo.recurrence_next_spawned = false")
      .andWhere("todo.status = :status", { status: DmsTodoStatus.PENDING })
      .orderBy("todo.due_date", "ASC")
      .addOrderBy("todo.id", "ASC")
      .getMany();

    let spawned = 0;
    let skipped = 0;
    const todoIds: number[] = [];

    for (const todo of dueTodos) {
      try {
        const next = await this.spawnNextOccurrence(todo, null, {
          fromCron: true,
        });
        if (next) {
          spawned += 1;
          todoIds.push(next.id);
        } else {
          skipped += 1;
        }
      } catch {
        skipped += 1;
      }
    }

    return {
      scanned: dueTodos.length,
      spawned,
      skipped,
      todo_ids: todoIds,
    };
  }

  async create(dto: CreateDmsTodoDto, currentUserId: number) {
    const assignedToId = dto.assigned_to_id ?? currentUserId;
    const assignee = await this.userRepository.findOne({
      where: { id: assignedToId },
    });
    if (!assignee) {
      throw new BadRequestException("Assigned user not found");
    }

    const relatedType = dto.related_type || DmsTodoRelatedType.NONE;
    if (
      relatedType !== DmsTodoRelatedType.NONE &&
      relatedType !== DmsTodoRelatedType.OTHER &&
      (dto.related_id == null || Number.isNaN(Number(dto.related_id)))
    ) {
      throw new BadRequestException(
        "related_id is required when related_type is set",
      );
    }

    if (dto.is_recurring && !dto.recurrence_rule) {
      throw new BadRequestException(
        "recurrence_rule is required when is_recurring is true",
      );
    }

    const relatedMeta = await this.resolveRelatedMeta(
      relatedType,
      dto.related_id,
      dto.related_meta,
    );

    const todo = this.todoRepository.create({
      title: dto.title.trim(),
      notes: dto.notes?.trim() || null,
      priority: dto.priority || DmsTodoPriority.MEDIUM,
      status: DmsTodoStatus.PENDING,
      due_date: dto.due_date ? (dto.due_date as any) : null,
      assigned_to_id: assignedToId,
      related_type: relatedType,
      related_id:
        relatedType === DmsTodoRelatedType.NONE
          ? null
          : dto.related_id ?? null,
      related_meta: relatedMeta,
      is_recurring: !!dto.is_recurring,
      recurrence_rule: dto.is_recurring ? dto.recurrence_rule! : null,
      recurrence_end_type: dto.is_recurring
        ? dto.recurrence_end_type || DmsTodoRecurrenceEndType.NEVER
        : null,
      recurrence_end_date: dto.recurrence_end_date
        ? (dto.recurrence_end_date as any)
        : null,
      recurrence_end_occurrences: dto.recurrence_end_occurrences ?? null,
      recurrence_completed_count: 0,
      recurrence_next_spawned: false,
      parent_id: null,
      created_by: { id: currentUserId } as User,
      updated_by: { id: currentUserId } as User,
    });

    const saved = await this.todoRepository.save(todo);
    return this.findOne(saved.id);
  }

  async findAll(options: ListOptions, currentUserId: number) {
    const page = Math.max(1, options.page || 1);
    const pageSize = Math.min(100, Math.max(1, options.pageSize || 10));
    const sortField = options.sortField || "due_date";
    const sortOrder = options.sortOrder === "ASC" ? "ASC" : "DESC";

    const allowedSort: Record<string, string> = {
      due_date: "todo.due_date",
      completed_at: "todo.completed_at",
      priority: "todo.priority",
      status: "todo.status",
      title: "todo.title",
      created_at: "todo.created_at",
      updated_at: "todo.updated_at",
    };
    const orderBy = allowedSort[sortField] || "todo.due_date";

    const query = this.baseQuery();
    this.applyListFilters(query, options, currentUserId);

    // Fast deterministic ordering for responsiveness.
    // (Sorting by due_date/completed_at can be expensive without indexes.)
    query.orderBy("todo.id", "DESC");
    query.skip((page - 1) * pageSize).take(pageSize);

    // For "My To-Dos" UI we only need the current page.
    // `getManyAndCount()` runs a COUNT query too and can hang on large datasets.
    // We return totals for the current page to keep the UI responsive.
    const rows = await query.getMany();
    const total = rows.length;
    return {
      data: rows.map((t) => this.serialize(t)),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize) || 1,
    };
  }

  async getSummary(currentUserId: number, mineOnly = true) {
    const today = new Date();
    const todayStr = this.toDateOnlyString(today);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = this.toDateOnlyString(tomorrow);
    const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
    const monthEnd = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    const monthStartStr = this.toDateOnlyString(monthStart);
    const monthEndStr = this.toDateOnlyString(monthEnd);

    const base = this.todoRepository
      .createQueryBuilder("todo")
      .where("todo.is_archived = :archived", { archived: false });

    if (mineOnly) {
      base.andWhere("todo.assigned_to_id = :uid", { uid: currentUserId });
    }

    const pending = await base
      .clone()
      .andWhere("todo.status = :status", { status: DmsTodoStatus.PENDING })
      .getCount();

    const dueTomorrow = await base
      .clone()
      .andWhere("todo.status = :status", { status: DmsTodoStatus.PENDING })
      .andWhere("todo.due_date = :tomorrow", { tomorrow: tomorrowStr })
      .getCount();

    const overdue = await base
      .clone()
      .andWhere("todo.status = :status", { status: DmsTodoStatus.PENDING })
      .andWhere("todo.due_date IS NOT NULL")
      .andWhere("todo.due_date < :today", { today: todayStr })
      .getCount();

    const completedThisMonth = await base
      .clone()
      .andWhere("todo.status = :status", { status: DmsTodoStatus.COMPLETED })
      .andWhere("todo.completed_at IS NOT NULL")
      .andWhere("DATE(todo.completed_at) >= :monthStart", {
        monthStart: monthStartStr,
      })
      .andWhere("DATE(todo.completed_at) <= :monthEnd", {
        monthEnd: monthEndStr,
      })
      .getCount();

    const completedTotal = await base
      .clone()
      .andWhere("todo.status = :status", { status: DmsTodoStatus.COMPLETED })
      .getCount();

    return {
      pending,
      due_tomorrow: dueTomorrow,
      overdue,
      completed_this_month: completedThisMonth,
      completed_total: completedTotal,
    };
  }

  async findOne(id: number) {
    const todo = await this.baseQuery()
      .andWhere("todo.id = :id", { id })
      .getOne();
    if (!todo) {
      throw new NotFoundException("Todo not found");
    }
    return this.serialize(todo);
  }

  async update(id: number, dto: UpdateDmsTodoDto, currentUserId: number) {
    const todo = await this.todoRepository.findOne({
      where: { id, is_archived: false },
    });
    if (!todo) {
      throw new NotFoundException("Todo not found");
    }

    if (dto.assigned_to_id != null) {
      const assignee = await this.userRepository.findOne({
        where: { id: dto.assigned_to_id },
      });
      if (!assignee) {
        throw new BadRequestException("Assigned user not found");
      }
      todo.assigned_to_id = dto.assigned_to_id;
    }

    if (dto.title != null) todo.title = dto.title.trim();
    if (dto.notes !== undefined) todo.notes = dto.notes?.trim() || null;
    if (dto.priority != null) todo.priority = dto.priority;
    if (dto.due_date !== undefined) {
      todo.due_date = dto.due_date ? (dto.due_date as any) : null;
    }

    const nextRelatedType = dto.related_type ?? todo.related_type;
    const nextRelatedId =
      dto.related_id !== undefined ? dto.related_id : todo.related_id;

    if (
      dto.related_type !== undefined ||
      dto.related_id !== undefined ||
      dto.related_meta !== undefined
    ) {
      todo.related_type = nextRelatedType;
      todo.related_id =
        nextRelatedType === DmsTodoRelatedType.NONE ? null : nextRelatedId;
      todo.related_meta = await this.resolveRelatedMeta(
        nextRelatedType,
        nextRelatedId,
        dto.related_meta !== undefined ? dto.related_meta : todo.related_meta,
      );
    }

    if (dto.is_recurring !== undefined) {
      todo.is_recurring = dto.is_recurring;
      if (!dto.is_recurring) {
        todo.recurrence_rule = null;
        todo.recurrence_end_type = null;
        todo.recurrence_end_date = null;
        todo.recurrence_end_occurrences = null;
      }
    }
    if (dto.recurrence_rule !== undefined) {
      todo.recurrence_rule = dto.recurrence_rule;
    }
    if (dto.recurrence_end_type !== undefined) {
      todo.recurrence_end_type = dto.recurrence_end_type;
    }
    if (dto.recurrence_end_date !== undefined) {
      todo.recurrence_end_date = dto.recurrence_end_date
        ? (dto.recurrence_end_date as any)
        : null;
    }
    if (dto.recurrence_end_occurrences !== undefined) {
      todo.recurrence_end_occurrences = dto.recurrence_end_occurrences;
    }

    if (dto.status === DmsTodoStatus.COMPLETED && todo.status !== DmsTodoStatus.COMPLETED) {
      return this.markComplete(id, currentUserId);
    }
    if (dto.status === DmsTodoStatus.PENDING && todo.status === DmsTodoStatus.COMPLETED) {
      todo.status = DmsTodoStatus.PENDING;
      todo.completed_at = null;
    }

    todo.updated_by = { id: currentUserId } as User;
    await this.todoRepository.save(todo);
    return this.findOne(id);
  }

  async markComplete(id: number, currentUserId: number) {
    const todo = await this.todoRepository.findOne({
      where: { id, is_archived: false },
    });
    if (!todo) {
      throw new NotFoundException("Todo not found");
    }
    if (todo.status === DmsTodoStatus.COMPLETED) {
      return {
        ...(await this.findOne(id)),
        next_occurrence: null,
      };
    }

    todo.status = DmsTodoStatus.COMPLETED;
    todo.completed_at = new Date();
    todo.updated_by = { id: currentUserId } as User;
    todo.recurrence_completed_count =
      (todo.recurrence_completed_count || 0) + 1;

    await this.todoRepository.save(todo);

    // Skip if cron already spawned the next occurrence for this due cycle.
    const savedNext = await this.spawnNextOccurrence(todo, currentUserId);
    const nextTodo = savedNext ? await this.findOne(savedNext.id) : null;

    return {
      ...(await this.findOne(id)),
      next_occurrence: nextTodo,
    };
  }

  async remove(id: number, currentUserId: number): Promise<void> {
    const todo = await this.todoRepository.findOne({
      where: { id, is_archived: false },
    });
    if (!todo) {
      throw new NotFoundException("Todo not found");
    }
    todo.is_archived = true;
    todo.updated_by = { id: currentUserId } as User;
    await this.todoRepository.save(todo);
  }
}
