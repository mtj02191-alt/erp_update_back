import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../utils/base_utils/entities/baseEntity";
import { Task } from "./task.entity";
import { User } from "../../users/user.entity";

@Entity("task_attachments")
export class TaskAttachment extends BaseEntity {
  @ManyToOne(() => Task, (task) => task.attachments, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "task_id" })
  task: Task;

  @Column({ type: "varchar" })
  file_name: string;

  @Column({ type: "varchar" })
  file_url: string;

  @Column({ type: "varchar", nullable: true })
  file_type: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "boolean", default: false })
  is_initial: boolean;

  @ManyToOne(() => User, (user) => user.id, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "uploaded_by" })
  uploaded_by: User;
}
