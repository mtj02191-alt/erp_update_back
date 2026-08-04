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

@Entity("ceo_note_approvals")
export class Approval {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({ type: "int", nullable: true, unique: true })
  note_id: number;

  @OneToOne(() => CeoNote, (note) => note.approval_detail, { onDelete: "CASCADE" })
  @JoinColumn({ name: "note_id" })
  note: CeoNote;

  @Column({ type: "varchar", length: 255, nullable: true })
  approval_type: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  approval_requested_by: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  approval_subject: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  approval_reference_number: string;

  @Column({ type: "decimal", precision: 15, scale: 2, nullable: true })
  approval_amount: number;

  @Column({
    type: "enum",
    enum: ["pending", "approved", "rejected", "request_clarification"],
    default: "pending",
    nullable: true,
  })
  approval_decision:
    | "pending"
    | "approved"
    | "rejected"
    | "request_clarification";

  @Column({ type: "text", nullable: true })
  approval_decision_remarks: string;

  @Column({ type: "jsonb", nullable: true })
  approval_history: {
    decision: string;
    remarks: string;
    decision_date: Date;
    decision_by_id: number;
  }[];

  @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;

  @UpdateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  updated_at: Date;
}
