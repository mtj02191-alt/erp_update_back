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

@Entity("ceo_note_follow_ups")
export class FollowUp {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({ type: "int", nullable: true, unique: true })
  note_id: number;

  @OneToOne(() => CeoNote, (note) => note.follow_up_detail, { onDelete: "CASCADE" })
  @JoinColumn({ name: "note_id" })
  note: CeoNote;

  @Column({ type: "varchar", length: 255, nullable: true })
  follow_up_requested_from: string;

  @Column({ type: "date", nullable: true })
  follow_up_requested_date: Date;

  @Column({ type: "date", nullable: true })
  follow_up_last_date: Date;

  @Column({ type: "date", nullable: true })
  follow_up_next_date: Date;

  @Column({ type: "text", nullable: true })
  follow_up_current_response: string;

  @Column({ type: "text", nullable: true })
  follow_up_remarks: string;

  @Column({ type: "jsonb", nullable: true, default: () => "'[]'" })
  follow_up_history: {
    date: Date;
    action: string;
    remarks: string;
  }[];

  @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  updated_at: Date;
}
