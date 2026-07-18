import { Column, Entity, Index } from "typeorm";
import { BaseEntity } from "../../../utils/base_utils/entities/baseEntity";

export enum CampaignStatus {
  DRAFT = "draft",
  ACTIVE = "active",
  PAUSED = "paused",
  ENDED = "ended",
  ARCHIVED = "archived",
}

@Entity("campaigns")
@Index("idx_campaigns_status_dates", ["status", "start_at", "end_at"])
@Index("idx_campaigns_project_id", ["project_id"])
export class Campaign extends BaseEntity {
  @Column({ type: "varchar", length: 200 })
  title: string;

  @Column({ type: "varchar", length: 220, unique: true })
  slug: string;

  @Column({ type: "text", nullable: true })
  description: string | null;

  @Column({
    type: "varchar",
    length: 20,
    default: CampaignStatus.DRAFT,
  })
  status: CampaignStatus;

  @Column({ type: "decimal", precision: 14, scale: 2, nullable: true })
  goal_amount: number | null;

  @Column({ type: "varchar", length: 10, default: "PKR" })
  currency: string;

  @Column({ type: "timestamptz", nullable: true })
  start_at: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  end_at: Date | null;

  @Column({ type: "bigint", nullable: true })
  project_id: number | null;

  @Column({ type: "text", nullable: true })
  cover_image_url: string | null;

  @Column({ type: "boolean", default: false })
  is_featured: boolean;
}
