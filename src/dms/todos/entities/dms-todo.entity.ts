import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "../../../utils/base_utils/entities/baseEntity";
import { User } from "../../../users/user.entity";

export enum DmsTodoStatus {
  PENDING = "pending",
  COMPLETED = "completed",
}

export enum DmsTodoPriority {
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
}

/** Optional link to a DMS record (extend as needed). */
export enum DmsTodoRelatedType {
  NONE = "none",
  DONATION_BOX = "donation_box",
  DONOR = "donor",
  VOLUNTEER = "volunteer",
  APPEAL = "appeal",
  CAMPAIGN = "campaign",
  EVENT = "event",
  OTHER = "other",
}

export enum DmsTodoRecurrenceRule {
  DAILY = "daily",
  WEEKLY = "weekly",
  BI_WEEKLY = "bi_weekly",
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
  ANNUALLY = "annually",
}

export enum DmsTodoRecurrenceEndType {
  NEVER = "never",
  ON_DATE = "on_date",
  AFTER_OCCURRENCES = "after_occurrences",
}

@Entity("dms_todos")
@Index("idx_dms_todos_assignee_status", ["assigned_to_id", "status"])
@Index("idx_dms_todos_due_date", ["due_date"])
@Index("idx_dms_todos_related", ["related_type", "related_id"])
export class DmsTodo extends BaseEntity {
  @Column({ type: "varchar", length: 255 })
  title: string;

  @Column({ type: "text", nullable: true })
  notes: string | null;

  @Column({
    type: "enum",
    enum: DmsTodoPriority,
    default: DmsTodoPriority.MEDIUM,
  })
  priority: DmsTodoPriority;

  @Column({
    type: "enum",
    enum: DmsTodoStatus,
    default: DmsTodoStatus.PENDING,
  })
  status: DmsTodoStatus;

  @Column({ type: "date", nullable: true })
  due_date: Date | null;

  @Column({ type: "timestamp", nullable: true })
  completed_at: Date | null;

  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "assigned_to_id" })
  assigned_to: User;

  @Column()
  assigned_to_id: number;

  /** Optional polymorphic link into DMS */
  @Column({
    type: "enum",
    enum: DmsTodoRelatedType,
    default: DmsTodoRelatedType.NONE,
  })
  related_type: DmsTodoRelatedType;

  @Column({ type: "int", nullable: true })
  related_id: number | null;

  /**
   * Snapshot for list UI (shop name, box id, address, etc.)
   * so we do not join every related table on every list.
   */
  @Column({ type: "jsonb", nullable: true })
  related_meta: Record<string, unknown> | null;

  // --- Recurrence ---
  @Column({ type: "boolean", default: false })
  is_recurring: boolean;

  @Column({
    type: "enum",
    enum: DmsTodoRecurrenceRule,
    nullable: true,
  })
  recurrence_rule: DmsTodoRecurrenceRule | null;

  @Column({
    type: "enum",
    enum: DmsTodoRecurrenceEndType,
    nullable: true,
    default: DmsTodoRecurrenceEndType.NEVER,
  })
  recurrence_end_type: DmsTodoRecurrenceEndType | null;

  @Column({ type: "date", nullable: true })
  recurrence_end_date: Date | null;

  @Column({ type: "int", nullable: true })
  recurrence_end_occurrences: number | null;

  @Column({ type: "int", default: 0 })
  recurrence_completed_count: number;

  /**
   * True once this occurrence has already created the next one
   * (via Mark as Done or the due-date cron). Prevents duplicates.
   */
  @Column({ type: "boolean", default: false })
  recurrence_next_spawned: boolean;

  /** Series root (null for one-time or the first item in a series). */
  @ManyToOne(() => DmsTodo, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "parent_id" })
  parent: DmsTodo | null;

  @Column({ type: "int", nullable: true })
  parent_id: number | null;
}
