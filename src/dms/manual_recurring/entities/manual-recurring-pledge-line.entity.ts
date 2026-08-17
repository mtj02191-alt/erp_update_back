import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../utils/base_utils/entities/baseEntity";
import { ManualRecurringPledge } from "./manual-recurring-pledge.entity";
import { CampaignDonationItem } from "../../campaigns/entities/campaign-donation-item.entity";

/** Quantity of a campaign item pledged per period (or per prepaid block). */
@Entity("manual_recurring_pledge_lines")
@Index("idx_pledge_lines_pledge", ["pledge_id"])
export class ManualRecurringPledgeLine extends BaseEntity {
  @ManyToOne(() => ManualRecurringPledge, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "pledge_id" })
  pledge: ManualRecurringPledge;

  @Column({ type: "int" })
  pledge_id: number;

  @ManyToOne(() => CampaignDonationItem, { nullable: false, onDelete: "RESTRICT" })
  @JoinColumn({ name: "campaign_item_id" })
  campaign_item: CampaignDonationItem;

  @Column({ type: "int" })
  campaign_item_id: number;

  /** Items per month (or per prepaid payment block). */
  @Column({ type: "int", default: 1 })
  quantity: number;
}
