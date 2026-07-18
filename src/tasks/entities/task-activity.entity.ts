import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../utils/base_utils/entities/baseEntity";
import {
  Task,
  TaskPriority,
  TaskStatus,
  TaskWorkflowType,
  TaskType,
} from "./task.entity";
import { User, Department } from "../../users/user.entity";

@Entity("task_activities")
export class TaskActivity extends BaseEntity {
  @ManyToOne(() => Task, (task) => task.activities, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "task_id" })
  task: Task;

  @Column({ type: "varchar" })
  action: string;

  @Column({ type: "varchar", nullable: true })
  title: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "varchar", nullable: true })
  priority: TaskPriority;

  @Column({ type: "varchar", nullable: true })
  status: TaskStatus;

  @Column({ type: "varchar", nullable: true })
  workflow_type: TaskWorkflowType;

  @Column({ type: "varchar", nullable: true })
  task_type: TaskType;

  @Column({ type: "date", nullable: true })
  start_date: Date;

  @Column({ type: "date", nullable: true })
  due_date: Date;

  @Column({ type: "varchar", nullable: true })
  project_name: string;

  @Column({ type: "varchar", nullable: true })
  recurrence_rule: string;

  @Column({ type: "date", nullable: true })
  recurrence_next_date: Date;

  @Column({ type: "int", array: true, nullable: true })
  assigned_user_ids: number[];

  @Column({ type: "jsonb", nullable: true })
  assigned_users_meta: { user_id: number; department: Department }[];

  @Column({ type: "jsonb", nullable: true, default: {} })
  details: any;

  @ManyToOne(() => User, (user) => user.id, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "performed_by" })
  performed_by: User;
}
