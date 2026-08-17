import { Column, Entity, Index } from "typeorm";
import { BaseEntity } from "../../../utils/base_utils/entities/baseEntity";

export enum SocialPostStatus {
  DRAFT = "draft",
  SCHEDULED = "scheduled",
  PUBLISHED = "published",
  FAILED = "failed",
  CANCELLED = "cancelled",
}

@Entity("social_posts")
@Index("idx_social_posts_status", ["status"])
@Index("idx_social_posts_campaign", ["campaign_id"])
@Index("idx_social_posts_appeal", ["appeal_id"])
export class SocialPost extends BaseEntity {
  @Column({ type: "int", nullable: true, default: null })
  campaign_id: number | null;

  @Column({ type: "int", nullable: true, default: null })
  appeal_id: number | null;

  @Column({ type: "varchar", length: 255, nullable: true, default: null })
  buffer_post_id: string | null;

  @Column({ type: "varchar", length: 255, nullable: true, default: null })
  buffer_channel_id: string | null;

  @Column({ type: "varchar", length: 255, nullable: true, default: null })
  buffer_channel_name: string | null;

  @Column({ type: "text", nullable: true, default: null })
  post_text: string | null;

  @Column({ type: "varchar", length: 1000, nullable: true, default: null })
  image_url: string | null;

  @Column({ type: "timestamp", nullable: true, default: null })
  scheduled_at: Date | null;

  @Column({
    type: "varchar",
    length: 50,
    default: SocialPostStatus.DRAFT,
  })
  status: SocialPostStatus;

  @Column({ type: "text", nullable: true, default: null })
  last_error: string | null;
}
