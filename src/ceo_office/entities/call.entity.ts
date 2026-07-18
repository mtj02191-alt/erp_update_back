import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "../../users/user.entity";
import { CeoNote } from "./ceo-note.entity";
import { Task } from "../../tasks/entities/task.entity";

@Entity("calls")
export class Call {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({ type: "varchar", length: 50, nullable: false, default: "call" })
  type: string;

  @Column({ type: "varchar", length: 255, nullable: false })
  caller_name: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  organization: string;

  @Column({ type: "varchar", length: 50, nullable: false })
  phone_number: string;

  @Column({ type: "text", nullable: true })
  call_purpose: string;

  @Column({ type: "text", nullable: true })
  call_summary: string;

  @Column({ type: "varchar", length: 10, nullable: false, default: "No" })
  follow_up_required: string;

  @Column({ type: "timestamp", nullable: true })
  follow_up_date: Date;

  @Column({ type: "varchar", length: 255, nullable: true })
  assigned_to: string;

  @Column({ type: "timestamp", nullable: false })
  visit_datetime: Date;

  @Column({ type: "int", nullable: true })
  related_note_id: number;

  @ManyToOne(() => CeoNote, {
    nullable: true,
    eager: false,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "related_note_id" })
  related_note: CeoNote;

  @Column({ type: "int", nullable: true })
  related_task_id: number;

  @ManyToOne(() => Task, {
    nullable: true,
    eager: false,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "related_task_id" })
  related_task: Task;

  @Column({ type: "text", nullable: true })
  remarks: string;

  @Column({ type: "varchar", length: 50, nullable: false, default: "Pending" })
  status: string;

  @Column({ type: "int", nullable: true })
  created_by_id: number;

  @ManyToOne(() => User, { nullable: true, eager: false, onDelete: "SET NULL" })
  @JoinColumn({ name: "created_by_id" })
  created_by: User;

  @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  updated_at: Date;
}
