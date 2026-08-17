import { Entity, Column, ManyToOne, JoinColumn, Unique } from "typeorm";
import { BaseEntity } from "../../utils/base_utils/entities/baseEntity";
import { Task } from "./task.entity";
import { User } from "../../users/user.entity";

@Entity("task_due_reminders")
@Unique("uq_task_due_reminder_slot", [
  "task_id",
  "user_id",
  "remind_on_date",
  "remind_at_hour",
])
export class TaskDueReminder extends BaseEntity {
  @Column({ type: "int" })
  task_id: number;

  @ManyToOne(() => Task, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "task_id" })
  task: Task;

  @Column({ type: "int" })
  user_id: number;

  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ type: "int" })
  offset_days: number;

  @Column({ type: "date" })
  remind_on_date: string;

  @Column({ type: "int" })
  remind_at_hour: number;
}
