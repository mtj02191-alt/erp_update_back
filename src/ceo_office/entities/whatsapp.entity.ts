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

@Entity("whatsapp_messages")
export class WhatsAppMessage {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({ type: "varchar", length: 50, nullable: false, default: "whatsapp" })
  type: string;

  @Column({ type: "varchar", length: 255, nullable: false })
  contact_name: string;

  @Column({ type: "varchar", length: 50, nullable: false })
  phone_number: string;

  @Column({ type: "text", nullable: true })
  message_summary: string;

  @Column({ type: "text", nullable: true })
  required_action: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  attachment_url: string;

  @Column({ type: "varchar", length: 50, nullable: true })
  response_status: string;

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

  @Column({
    type: "varchar",
    length: 50,
    nullable: false,
    default: "Pending Reply",
  })
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
