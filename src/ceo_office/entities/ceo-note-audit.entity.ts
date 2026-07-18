import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "../../users/user.entity";
import { CeoNote } from "./ceo-note.entity";

@Entity("ceo_note_audits")
export class CeoNoteAudit {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({ type: "int", nullable: false })
  note_id: number;

  @ManyToOne(() => CeoNote, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "note_id" })
  note: CeoNote;

  @Column({ type: "int", nullable: true })
  user_id: number;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @Column({ type: "varchar", length: 100, nullable: false })
  action: string;

  @Column({ type: "jsonb", nullable: true })
  old_value: any;

  @Column({ type: "jsonb", nullable: true })
  new_value: any;

  @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;
}
