import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  JoinTable,
  JoinColumn,
  OneToMany,
} from "typeorm";
import { User, Department } from "../../users/user.entity";
import { Task } from "../../tasks/entities/task.entity";

export enum CeoNoteCategory {
  TOP_PRIORITY = "top_priority",
  TODAY_TASK = "today_task",
  FOLLOW_UP = "follow_up",
  CALLS = "calls",
  WHATSAPP = "whatsapp",
  VISITORS = "visitors",
  MEETINGS = "meetings",
  CEO_DIRECT_ORDERS = "ceo_direct_orders",
  IMPORTANT_DECISIONS = "important_decisions",
  EMAILS_AND_APPROVALS = "emails_and_approvals",
  WAITING_RESPONSE = "waiting_response",
  PROJECT_COMMAND_SHEETS = "project_command_sheets",
  PROJECT_NOTES = "project_notes",
  COMPLETED = "completed",
}

export enum CeoNoteStatus {
  UNPROCESSED = "unprocessed",
  PENDING = "pending",
  IN_PROGRESS = "in_progress",
  WAITING_RESPONSE = "waiting_response",
  SUBMITTED = "submitted",
  APPROVED = "approved",
  REJECTED = "rejected",
  COMPLETED = "completed",
  CLOSED = "closed",
  CANCELLED = "cancelled",
}

@Entity("ceo_notes")
export class CeoNote {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({ type: "date", nullable: false, default: () => "CURRENT_DATE" })
  date: Date;

  @Column({
    type: "enum",
    enum: CeoNoteCategory,
    default: CeoNoteCategory.TODAY_TASK,
  })
  category: CeoNoteCategory;

  @Column({ type: "varchar", length: 500, nullable: false })
  title: string;

  @Column({ type: "text", nullable: true })
  details: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  related_person: string;

  @Column({
    type: "enum",
    enum: Department,
    nullable: true,
  })
  department: Department;

  @Column({
    type: "enum",
    enum: ["low", "medium", "high", "critical"],
    default: "medium",
  })
  priority: "low" | "medium" | "high" | "critical";

  @Column({ type: "date", nullable: true })
  due_date: Date;

  @Column({
    type: "enum",
    enum: CeoNoteStatus,
    default: CeoNoteStatus.UNPROCESSED,
  })
  status: CeoNoteStatus;

  @Column({ type: "text", nullable: true })
  attachment: string;

  @Column({ type: "text", nullable: true })
  voice_note: string;

  @Column({ type: "text", nullable: true })
  pa_remarks: string;

  @Column({ type: "text", nullable: true })
  ceo_remarks: string;

  @Column({ type: "int", nullable: true })
  created_by_id: number;

  @ManyToOne(() => User, { nullable: true, eager: false, onDelete: "SET NULL" })
  @JoinColumn({ name: "created_by_id" })
  created_by: User;

  @Column({ type: "int", nullable: true })
  related_task_id: number;

  @ManyToOne(() => Task, { nullable: true, eager: false, onDelete: "SET NULL" })
  @JoinColumn({ name: "related_task_id" })
  related_task: Task;

  @Column("simple-array", { nullable: true })
  assigned_user_ids: number[];

  @ManyToMany(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinTable()
  assigned_users: User[];

  // ==================== FOLLOW-UP CATEGORY FIELDS ====================
  @Column({ type: "varchar", length: 255, nullable: true })
  follow_up_requested_from: string;

  @Column({ type: "date", nullable: true })
  follow_up_requested_date: Date;

  @Column({ type: "date", nullable: true })
  follow_up_last_date: Date;

  @Column({ type: "date", nullable: true })
  follow_up_next_date: Date;

  @Column({ type: "text", nullable: true })
  follow_up_current_response: string;

  @Column({ type: "text", nullable: true })
  follow_up_remarks: string;

  @Column({ type: "jsonb", nullable: true, default: () => "'[]'" })
  follow_up_history: {
    date: Date;
    action: string;
    remarks: string;
  }[];

  // ==================== MEETING CATEGORY FIELDS ====================
  @Column({ type: "timestamp", nullable: true })
  meeting_date: Date;

  @Column({ type: "varchar", length: 255, nullable: true })
  meeting_with: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  meeting_subject: string;

  @Column({ type: "jsonb", nullable: true, default: () => "'[]'" })
  meeting_discussion_points: {
    id: string;
    content: string;
  }[];

  @Column({ type: "jsonb", nullable: true, default: () => "'[]'" })
  meeting_decisions: {
    id: string;
    content: string;
  }[];

  @Column({ type: "jsonb", nullable: true, default: () => "'[]'" })
  meeting_action_items: {
    id: string;
    content: string;
    assigned_to?: string;
    due_date?: Date;
    status?: string;
    related_task_id?: number;
  }[];

  // ==================== EMAILS & APPROVALS CATEGORY FIELDS ====================
  @Column({ type: "varchar", length: 255, nullable: true })
  approval_type: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  approval_requested_by: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  approval_subject: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  approval_reference_number: string;

  @Column({ type: "decimal", precision: 15, scale: 2, nullable: true })
  approval_amount: number;

  @Column({
    type: "enum",
    enum: ["pending", "approved", "rejected", "request_clarification"],
    default: "pending",
    nullable: true,
  })
  approval_decision:
    | "pending"
    | "approved"
    | "rejected"
    | "request_clarification";

  @Column({ type: "text", nullable: true })
  approval_decision_remarks: string;

  // ==================== WAITING RESPONSE CATEGORY FIELDS ====================
  @Column({ type: "varchar", length: 255, nullable: true })
  waiting_response_requested_from: string;

  @Column({ type: "date", nullable: true })
  waiting_response_request_date: Date;

  @Column({ type: "date", nullable: true })
  waiting_response_expected_date: Date;

  @Column({ type: "date", nullable: true })
  waiting_response_last_reminder_date: Date;

  @Column({
    type: "enum",
    enum: ["waiting_response", "reminder_sent", "received", "closed"],
    default: "waiting_response",
    nullable: true,
  })
  waiting_response_status:
    | "waiting_response"
    | "reminder_sent"
    | "received"
    | "closed";

  @Column({ type: "text", nullable: true })
  waiting_response_remarks: string;

  @Column({ type: "jsonb", nullable: true, default: () => "'[]'" })
  waiting_response_reminders: {
    id: string;
    date: Date;
    notes: string;
  }[];

  // ==================== PROJECT COMMAND SHEETS CATEGORY FIELDS ====================
  @Column({ type: "varchar", length: 500, nullable: true })
  project_name: string;

  @Column({ type: "text", nullable: true })
  project_details: string;

  @Column({ type: "text", nullable: true })
  discussions: string;

  @Column({ type: "text", nullable: true })
  decisions: string;

  @Column({ type: "text", nullable: true })
  meeting_notes: string;

  @Column({ type: "jsonb", nullable: true, default: () => "'[]'" })
  pending_items: {
    id: string;
    text: string;
    status?: string;
  }[];

  @Column({ type: "jsonb", nullable: true, default: () => "'[]'" })
  action_items: {
    id: string;
    text: string;
    assigned_to_id?: number;
    due_date?: Date;
    status?: string;
    related_task_id?: number;
  }[];

  @Column({ type: "date", nullable: true })
  start_date: Date;

  @Column({ type: "date", nullable: true })
  end_date: Date;

  @Column({ type: "varchar", length: 50, nullable: true, default: "Pending" })
  pcs_status: string;

  @Column({ type: "text", nullable: true })
  next_steps: string;

  @Column({ type: "text", nullable: true })
  results: string;

  // ==================== VISITORS/CALLS/WHATSAPP CATEGORY FIELDS ====================
  @Column({ type: "varchar", length: 50, nullable: true })
  type: string;

  // Visitor specific fields
  @Column({ type: "varchar", length: 255, nullable: true })
  visitor_name: string;

  // Call specific fields
  @Column({ type: "varchar", length: 255, nullable: true })
  caller_name: string;

  // WhatsApp specific fields
  @Column({ type: "varchar", length: 255, nullable: true })
  contact_name: string;

  // Common fields for all three types
  @Column({ type: "varchar", length: 255, nullable: true })
  organization: string;

  @Column({ type: "text", nullable: true })
  purpose: string;

  @Column({ type: "varchar", length: 255, nullable: true, name: "visitor_meeting_with" })
  visitor_meeting_with: string;

  @Column({ type: "varchar", length: 255, nullable: true, name: "visitor_department" })
  visitor_department: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  protocol_required: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  expected_duration: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  visitor_outcome: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  phone_number: string;

  @Column({ type: "text", nullable: true })
  call_purpose: string;

  @Column({ type: "text", nullable: true })
  call_summary: string;

  @Column({ type: "varchar", length: 10, nullable: true, default: "No" })
  follow_up_required: string;

  @Column({ type: "timestamp", nullable: true })
  follow_up_date: Date;

  @Column({ type: "varchar", length: 255, nullable: true })
  assigned_to: string;

  @Column({ type: "text", nullable: true })
  message_summary: string;

  @Column({ type: "text", nullable: true })
  required_action: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  attachment_url: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  response_status: string;

  @Column({ type: "timestamp", nullable: true })
  visit_datetime: Date;

  // ==================== EXISTING FIELDS ====================
  @Column({ type: "jsonb", nullable: true })
  approval_history: {
    decision: "approved" | "rejected" | "clarification_requested";
    remarks: string;
    decision_date: Date;
    decision_by_id: number;
  }[];

  @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  updated_at: Date;
}
