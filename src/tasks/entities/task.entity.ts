import {
  Entity,
  Column,
  OneToMany,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User, Department } from "../../users/user.entity";
import { TaskAttachment } from "./task-attachment.entity";
import { TaskComment } from "./task-comment.entity";
import { TaskActivity } from "./task-activity.entity";
import { TaskTimeEntry } from "./task-time-entry.entity";

export enum TaskPriority {
  LOW = "low",
  MEDIUM = "medium",
  HIGH = "high",
  CRITICAL = "critical",
}

export enum TaskStatus {
  DRAFT = "draft",
  OPEN = "open",
  IN_PROGRESS = "in_progress",
  BLOCKED = "blocked",
  PENDING_APPROVAL = "pending_approval",
  APPROVED = "approved",
  REJECTED = "rejected",
  COMPLETED = "completed",
  CLOSED = "closed",
  CANCELLED = "cancelled",
}

export enum TaskWorkflowType {
  STANDARD = "standard",
  APPROVAL_REQUIRED = "approval_required",
}

export enum TaskType {
  ONE_TIME = "one_time",
  RECURRING = "recurring",
  PROJECT_LINKED = "project_linked",
}

export enum RecurrenceEndType {
  NEVER = "never",
  ON_DATE = "on_date",
  AFTER_OCCURRENCES = "after_occurrences",
}

@Entity("tasks")
export class Task {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({ type: "varchar" })
  title: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({
    type: "enum",
    enum: Department,
  })
  department: Department;

  @Column({
    type: "enum",
    enum: TaskPriority,
    default: TaskPriority.MEDIUM,
  })
  priority: TaskPriority;

  @Column({
    type: "enum",
    enum: TaskStatus,
    default: TaskStatus.OPEN,
  })
  status: TaskStatus;

  @Column({
    type: "enum",
    enum: TaskWorkflowType,
    default: TaskWorkflowType.STANDARD,
  })
  workflow_type: TaskWorkflowType;
  @Column({ type: "int", array: true, nullable: true })
  approval_required_user_ids: number[];

  @Column({
    type: "enum",
    enum: TaskType,
    default: TaskType.ONE_TIME,
  })
  task_type: TaskType;

  @Column({ type: "date", nullable: true })
  start_date: Date;

  @Column({ type: "date", nullable: true })
  due_date: Date;

  @Column({ type: "date", nullable: true })
  completed_date: Date;

  @Column({ type: "int", array: true, nullable: true })
  assigned_user_ids: number[];

  @Column({ type: "jsonb", nullable: true })
  assigned_users_meta: { user_id: number; department: Department }[];

  @Column({ type: "int", nullable: true, name: "reported_to" })
  reported_by_id: number;

  @ManyToOne(() => User, { nullable: true, eager: false, onDelete: "SET NULL" })
  @JoinColumn({ name: "reported_to" })
  reported_by: User;

  @Column({ type: "int", nullable: true })
  created_by_id: number;

  @ManyToOne(() => User, { nullable: true, eager: false, onDelete: "SET NULL" })
  @JoinColumn({ name: "created_by_id" })
  created_by: User;

  @Column({ type: "int", nullable: true })
  updated_by_id: number;

  @ManyToOne(() => User, { nullable: true, eager: false, onDelete: "SET NULL" })
  @JoinColumn({ name: "updated_by_id" })
  updated_by: User;

  @Column({ type: "int", array: true, nullable: true, name: "approved_by_id" })
  approved_by_id: number[];

  @Column({ type: "int", array: true, nullable: true, name: "rejected_by_id" })
  rejected_by_id: number[];

  @Column({ type: "varchar", nullable: true, default: null })
  project_id: string;

  @Column({ type: "varchar", nullable: true, default: null })
  project_name: string;

  @Column({ type: "varchar", nullable: true, default: null })
  recurrence_rule: string;

  @Column({ type: "date", nullable: true })
  recurrence_next_date: Date;

  @Column({
    type: "enum",
    enum: RecurrenceEndType,
    default: RecurrenceEndType.NEVER,
    nullable: true,
  })
  recurrence_end_type: RecurrenceEndType;

  @Column({ type: "date", nullable: true })
  recurrence_end_date: Date;

  @Column({ type: "int", nullable: true })
  recurrence_end_occurrences: number;

  @Column({ type: "int", default: 0 })
  recurrence_created_count: number;

  @Column({ type: "int", default: 0 })
  progress: number;

  @Column({ type: "boolean", default: false })
  overdue_email_sent: boolean;

  @Column({ type: "text", nullable: true })
  last_progress_notes: string;

  @Column({ type: "text", array: true, nullable: true })
  mov_items: string[];

  @Column({ type: "varchar", nullable: true })
  source: string; // e.g., "ceo_note", "project_command_sheet_action_item"

  @Column({ type: "int", nullable: true })
  source_id: number; // The ID of the source entity

  @OneToMany(() => TaskAttachment, (att) => att.task, { cascade: true })
  attachments: TaskAttachment[];

  @OneToMany(() => TaskComment, (c) => c.task, { cascade: true })
  comments: TaskComment[];

  @OneToMany(() => TaskActivity, (a) => a.task, { cascade: true })
  activities: TaskActivity[];

  @OneToMany(() => TaskTimeEntry, (e) => e.task, { cascade: true })
  time_entries: TaskTimeEntry[];

  @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  updated_at: Date;
}
