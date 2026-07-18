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
import { Task } from "../../tasks/entities/task.entity";

@Entity("project_command_sheets")
export class ProjectCommandSheet {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({ type: "varchar", length: 500, nullable: false })
  project_name: string;

  @Column({ type: "text", nullable: true })
  project_details: string;

  @Column({ type: "text", nullable: true })
  discussions: string;

  @Column({ type: "text", nullable: true })
  decisions: string;

  @Column({ type: "text", nullable: true })
  meeting_notes: string;

  @Column({ type: "jsonb", nullable: true })
  pending_items: {
    id: string;
    text: string;
    status: "pending" | "completed";
    created_at: Date;
    completed_at?: Date;
  }[];

  @Column({ type: "jsonb", nullable: true })
  action_items: {
    id: string;
    text: string;
    assigned_to_id?: number;
    due_date?: Date;
    status: "pending" | "in_progress" | "completed";
    related_task_id?: number;
  }[];

  @Column({ type: "text", nullable: true })
  next_steps: string;

  @Column({ type: "text", nullable: true })
  results: string;

  @Column({ type: "date", nullable: true })
  start_date: Date;

  @Column({ type: "date", nullable: true })
  end_date: Date;

  @Column({ type: "varchar", length: 50, nullable: true, default: "Pending" })
  status: string;

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

  @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  updated_at: Date;
}
