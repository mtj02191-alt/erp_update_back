import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  ManyToOne,
  JoinColumn,
  PrimaryGeneratedColumn,
} from "typeorm";
import { Event } from "./event.entity";

export enum EventPassStatus {
  UNUSED = "unused",
  USED = "used",
  REVOKED = "revoked",
  EXPIRED = "expired",
}

@Entity("event_passes")
@Index("idx_event_passes_event_status", ["event_id", "status"])
@Index("idx_event_passes_used_at", ["used_at"])
export class EventPass {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @ManyToOne(() => Event, (event) => event.passes, { onDelete: "CASCADE" })
  @JoinColumn({ name: "event_id" })
  event: Event;

  @Column({ type: "bigint" })
  event_id: number;

  @Column({ type: "varchar", length: 80, unique: true })
  pass_code: string;

  @Column({
    type: "varchar",
    length: 20,
    default: EventPassStatus.UNUSED,
  })
  status: string;

  @Column({ type: "timestamptz", nullable: true })
  used_at: Date | null;

  @Column({ type: "bigint", nullable: true })
  used_by: number | null;

  @Column({ type: "varchar", length: 80, nullable: true })
  device_id: string | null;

  @CreateDateColumn({ type: "timestamptz", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;
}
