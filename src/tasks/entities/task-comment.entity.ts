import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../utils/base_utils/entities/baseEntity";
import { Task } from "./task.entity";
import { User } from "../../users/user.entity";

@Entity("task_comments")
export class TaskComment extends BaseEntity {
  @ManyToOne(() => Task, (task) => task.comments, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "task_id" })
  task: Task;

  @Column({ type: "text" })
  content: string;

  @ManyToOne(() => User, (user) => user.id, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "author" })
  author: User;
}
