import { Column, Entity, Index } from "typeorm";
import { BaseEntity } from "../../../utils/base_utils/entities/baseEntity";
import { CampaignTargetFrequency } from "../utils/campaign-recurring.constants";
import {
  CampaignCommunicationTemplates,
} from "../utils/campaign-communication.constants";

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
@Index("idx_campaigns_program_id", ["program_id"])
@Index("idx_campaigns_sub_program_id", ["sub_program_id"])
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

  /** Optional link to ERP program (`programs.id`) */
  @Column({ type: "bigint", nullable: true })
  program_id: number | null;

  /** Optional link to program subprogram (`program_subprograms.id`) */
  @Column({ type: "bigint", nullable: true })
  sub_program_id: number | null;

  @Column({ type: "text", nullable: true })
  cover_image_url: string | null;

  @Column({ type: "boolean", default: false })
  is_featured: boolean;

  /** When true, goal_amount is the target for each target_frequency period */
  @Column({ type: "boolean", default: false })
  is_recurring: boolean;

  @Column({
    type: "varchar",
    length: 20,
    nullable: true,
  })
  target_frequency: CampaignTargetFrequency | null;

  /** Run donor check automation (schedule depends on target_frequency). */
  @Column({ type: "boolean", default: false })
  monthly_donor_automation_enabled: boolean;

  /**
   * When true, recurring thanks/reminders use the existing donation thanks
   * (email + WhatsApp) and payment-link (email + WhatsApp) flows instead of
   * manual DMS communication_templates for those two slots.
   */
  @Column({ type: "boolean", default: false })
  use_default_thanks_and_reminders: boolean;

  /** Per-slot templates: marketing, thanks, reminder, payment_link */
  @Column({ type: "jsonb", nullable: true, default: null })
  communication_templates: CampaignCommunicationTemplates | null;
}
