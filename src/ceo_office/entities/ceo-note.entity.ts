
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  ManyToMany,
  OneToOne,
  JoinTable,
  JoinColumn,
} from "typeorm";
import { User, Department } from "../../users/user.entity";
import { Task } from "../../tasks/entities/task.entity";
import { Meeting } from "./meeting.entity";
import { Approval } from "./approval.entity";
import { FollowUp } from "./follow-up.entity";
import { WaitingResponse } from "./waiting-response.entity";
import { ProjectCommandSheet } from "./project-command-sheet.entity";
import { Visitor } from "./visitor.entity";
import { Call } from "./call.entity";
import { WhatsAppMessage } from "./whatsapp.entity";

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

  // ==================== CATEGORY ENTITY RELATIONS ====================
  @OneToOne(() => Meeting, (meeting) => meeting.note, { eager: false, cascade: true })
  meeting_detail: Meeting;

  @OneToOne(() => Approval, (approval) => approval.note, { eager: false, cascade: true })
  approval_detail: Approval;

  @OneToOne(() => FollowUp, (followUp) => followUp.note, { eager: false, cascade: true })
  follow_up_detail: FollowUp;

  @OneToOne(() => WaitingResponse, (waitingResponse) => waitingResponse.note, { eager: false, cascade: true })
  waiting_response_detail: WaitingResponse;

  @OneToOne(() => ProjectCommandSheet, (pcs) => pcs.note, { eager: false, cascade: true })
  project_command_sheet_detail: ProjectCommandSheet;

  @OneToOne(() => Visitor, (visitor) => visitor.related_note, { eager: false, cascade: true })
  visitor_detail: Visitor;

  @OneToOne(() => Call, (call) => call.related_note, { eager: false, cascade: true })
  call_detail: Call;

  @OneToOne(() => WhatsAppMessage, (whatsapp) => whatsapp.related_note, { eager: false, cascade: true })
  whatsapp_detail: WhatsAppMessage;

  @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  updated_at: Date;
}
