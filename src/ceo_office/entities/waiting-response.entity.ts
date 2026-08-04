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

@Entity("ceo_note_waiting_responses")
export class WaitingResponse {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({ type: "int", nullable: true, unique: true })
  note_id: number;

  @OneToOne(() => CeoNote, (note) => note.waiting_response_detail, { onDelete: "CASCADE" })
  @JoinColumn({ name: "note_id" })
  note: CeoNote;

  @Column({ type: "varchar", length: 255, nullable: true })
  waiting_response_requested_from: string;

  @Column({ type: "date", nullable: true })
  waiting_response_request_date: Date;

  @Column({ type: "date", nullable: true })
  waiting_response_expected_date: Date;

  @Column({ type: "date", nullable: true })
  waiting_response_last_reminder_date: Date;

  @Column({
    type: "enum",
    enum: ["waiting_response", "reminder_sent", "received", "closed"],
    default: "waiting_response",
    nullable: true,
  })
  waiting_response_status:
    | "waiting_response"
    | "reminder_sent"
    | "received"
    | "closed";

  @Column({ type: "text", nullable: true })
  waiting_response_remarks: string;

  @Column({ type: "jsonb", nullable: true, default: () => "'[]'" })
  waiting_response_reminders: {
    id: string;
    date: Date;
    notes: string;
  }[];

  @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  updated_at: Date;
}
