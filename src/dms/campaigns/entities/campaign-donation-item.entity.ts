import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../utils/base_utils/entities/baseEntity";
import { Campaign } from "./campaign.entity";

/** Donation catalog item on a recurring campaign (e.g. 1 meal, 1 blanket). */
@Entity("campaign_donation_items")
@Index("idx_campaign_donation_items_campaign", ["campaign_id"])
export class CampaignDonationItem extends BaseEntity {
  @ManyToOne(() => Campaign, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "campaign_id" })
  campaign: Campaign;

  @Column({ type: "bigint" })
  campaign_id: number;

  @Column({ type: "varchar", length: 200 })
  name: string;

  @Column({ type: "text", nullable: true, default: null })
  description: string | null;

  @Column({ type: "decimal", precision: 14, scale: 2 })
  unit_price: number;

  @Column({ type: "varchar", length: 10, default: "PKR" })
  currency: string;

  @Column({ type: "int", default: 0 })
  sort_order: number;

  @Column({ type: "boolean", default: true })
  is_active: boolean;
}
