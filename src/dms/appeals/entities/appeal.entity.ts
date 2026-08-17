import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { BaseEntity } from "../../../utils/base_utils/entities/baseEntity";
import { AppealsBenificiary } from "../../appeals_benificiaries/entities/appeals_benificiary.entity";
import { AppealUpdate } from "../../appeal_updates/entities/appeal_update.entity";
import { AppealMedia } from "../../appeal_media/entities/appeal_media.entity";

export enum AppealStatus {
  DRAFT = "draft",
  ACTIVE = "active",
  PAUSED = "paused",
  ENDED = "ended",
  ARCHIVED = "archived",
}

export enum AppealCategory {
  MEDICAL = "medical",
  EDUCATION = "education",
  RATION = "ration",
  WIDOW_SUPPORT = "widow_support",
  EMERGENCY = "emergency",
  OTHER = "other",
}

@Entity("appeals")
@Index("idx_appeals_status_dates", ["status", "start_at", "end_at"])
@Index("idx_appeals_category", ["category"])
@Index("idx_appeals_slug", ["slug"], { unique: true })
export class Appeal extends BaseEntity {
  @Column({ type: "varchar", length: 250 })
  title: string;

  @Column({ type: "varchar", length: 260, unique: true })
  slug: string;

  @Column({ type: "text", nullable: true })
  short_description: string | null;

  @Column({ type: "text", nullable: true })
  story: string | null;

  @Column({
    type: "varchar",
    length: 20,
    default: AppealStatus.DRAFT,
  })
  status: AppealStatus;

  @Column({
    type: "varchar",
    length: 40,
    default: AppealCategory.MEDICAL,
  })
  category: AppealCategory;

  @Column({ type: "varchar", length: 500, nullable: true })
  tags: string | null;

  @Column({ type: "decimal", precision: 14, scale: 2, nullable: true })
  goal_amount: number | null;

  @Column({ type: "varchar", length: 10, default: "PKR" })
  currency: string;

  @Column({ type: "timestamptz", nullable: true })
  start_at: Date | null;

  @Column({ type: "timestamptz", nullable: true })
  end_at: Date | null;

  @Column({ type: "text", nullable: true })
  cover_image_url: string | null;

  @Column({ type: "boolean", default: false })
  is_featured: boolean;

  @Column({ type: "boolean", default: false })
  is_urgent: boolean;

  @Column({ type: "boolean", default: true })
  is_verified: boolean;

  @Column({ type: "boolean", default: true })
  donation_protected: boolean;

  @Column({ type: "varchar", length: 200, nullable: true })
  organizer_name: string | null;

  @Column({ type: "varchar", length: 200, nullable: true })
  organizer_location: string | null;

  @Column({ type: "text", nullable: true })
  organizer_bio: string | null;

  @Column({ type: "text", nullable: true })
  organizer_image_url: string | null;

  @Column({ type: "boolean", default: false })
  organizer_verified: boolean;

  @Column({ type: "jsonb", nullable: true })
  impact_points: string[] | null;

  @ManyToOne(() => AppealsBenificiary, {
    nullable: true,
    eager: false,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "beneficiary_id" })
  beneficiary: AppealsBenificiary | null;

  @Column({ type: "bigint", nullable: true })
  beneficiary_id: number | null;

  @OneToMany(() => AppealUpdate, (update) => update.appeal)
  updates: AppealUpdate[];

  @OneToMany(() => AppealMedia, (media) => media.appeal)
  media: AppealMedia[];
}
