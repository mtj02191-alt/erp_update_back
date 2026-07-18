import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../utils/base_utils/entities/baseEntity";
import { User } from "../../users/user.entity";
import { Task } from "./task.entity";

export enum TaskNotificationType {
  ASSIGNED = "assigned",
  OVERDUE = "overdue",
  COMPLETED = "completed",
  APPROVED = "approved",
  REJECTED = "rejected",
}

@Entity("task_notifications")
export class TaskNotification extends BaseEntity {
  // _id is mapped to id in BaseEntity
  get _id(): number {
    return this.id;
  }

  @Column({ name: "user_id" })
  userId: number;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ name: "task_id" })
  taskId: number;

  @ManyToOne(() => Task, { onDelete: "CASCADE" })
  @JoinColumn({ name: "task_id" })
  task: Task;

  @Column({
    type: "enum",
    enum: TaskNotificationType,
  })
  type: TaskNotificationType;

  @Column({ name: "is_read", default: false })
  isRead: boolean;

  @Column({
    name: "sent_at",
    type: "timestamp",
    default: () => "CURRENT_TIMESTAMP",
  })
  sentAt: Date;
}
