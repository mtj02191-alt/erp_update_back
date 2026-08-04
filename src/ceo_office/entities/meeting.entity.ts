import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from "typeorm";
import { CeoNote } from "./ceo-note.entity";

@Entity("ceo_note_meetings")
export class Meeting {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({ type: "int", nullable: true, unique: true })
  note_id: number;

  @OneToOne(() => CeoNote, (note) => note.meeting_detail, { onDelete: "CASCADE" })
  @JoinColumn({ name: "note_id" })
  note: CeoNote;

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

  @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  updated_at: Date;
}
