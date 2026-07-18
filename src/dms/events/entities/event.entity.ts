import { Column, Entity, Index, OneToMany } from "typeorm";
import { BaseEntity } from "../../../utils/base_utils/entities/baseEntity";
import { EventPass } from "./event_pass.entity";

export enum EventStatus {
  DRAFT = "draft",
  UPCOMING = "upcoming",
  ONGOING = "ongoing",
  COMPLETED = "completed",
  CANCELLED = "cancelled",
  ARCHIVED = "archived",
}

export enum EventType {
  FUNDRAISING = "fundraising",
  AWARENESS = "awareness",
  MEDICAL = "medical",
  INTERNAL = "internal",
}

@Entity("events")
@Index("idx_events_slug", ["slug"], { unique: true })
@Index("idx_events_status_dates", ["status", "start_at", "end_at"])
@Index("idx_events_campaign_id", ["campaign_id"])
@Index("idx_events_capacity", ["allowed_attendees", "attendees_count"])
export class Event extends BaseEntity {
  @Column({ type: "varchar", length: 200 })
  title: string;

  @Column({ type: "varchar", length: 220, unique: true })
  slug: string;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({
    type: "varchar",
    length: 20,
    default: EventStatus.DRAFT,
  })
  status: EventStatus;

  @Column({ type: "varchar", length: 50, nullable: true })
  event_type: EventType | string | null;

  @Column({ type: "timestamptz" })
  start_at: Date;

  @Column({ type: "timestamptz" })
  end_at: Date;

  @Column({ type: "text", nullable: true })
  location: string | null;

  @Column({ type: "bigint", nullable: true })
  campaign_id: number | null;

  @Column({ type: "boolean", default: true })
  is_public: boolean;

  @Column({ type: "int", default: 0 })
  allowed_attendees: number;

  @Column({ type: "int", default: 0 })
  attendees_count: number;

  @OneToMany(() => EventPass, (pass) => pass.event)
  passes: EventPass[];
}
