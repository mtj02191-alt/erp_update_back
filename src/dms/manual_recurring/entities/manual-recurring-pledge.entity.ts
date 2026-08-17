import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany } from "typeorm";
import { ManualRecurringPledgeLine } from "./manual-recurring-pledge-line.entity";
import { BaseEntity } from "../../../utils/base_utils/entities/baseEntity";
import { Donor } from "../../donor/entities/donor.entity";
import { Campaign } from "../../campaigns/entities/campaign.entity";
import {
  ManualRecurringFrequency,
  ManualRecurringStatus,
} from "../utils/manual-recurring.constants";

/**
 * Donor enrolled on a recurring campaign (manual/offline monthly giving).
 * Monthly job (2nd): thanks if donated to campaign/project; reminder if not.
 */
@Entity("manual_recurring_pledges")
@Index("idx_manual_recurring_pledges_donor_status", ["donor_id", "status"])
export class ManualRecurringPledge extends BaseEntity {
  @ManyToOne(() => Donor, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "donor_id" })
  donor: Donor;

  @Column({ type: "int" })
  donor_id: number;

  @ManyToOne(() => Campaign, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "campaign_id" })
  campaign: Campaign | null;

  /** Null = general / project recurring (not tied to a campaign). */
  @Column({ type: "bigint", nullable: true, default: null })
  campaign_id: number | null;

  @Column({ type: "decimal", precision: 14, scale: 2, nullable: true })
  pledged_amount: number | null;

  @Column({ type: "varchar", length: 10, default: "PKR" })
  currency: string;

  @Column({
    type: "varchar",
    length: 20,
    default: ManualRecurringFrequency.MONTHLY,
  })
  frequency: ManualRecurringFrequency;

  @Column({
    type: "varchar",
    length: 20,
    default: ManualRecurringStatus.ACTIVE,
  })
  status: ManualRecurringStatus;

  @Column({ type: "boolean", default: true })
  remind_via_email: boolean;

  @Column({ type: "boolean", default: true })
  remind_via_whatsapp: boolean;

  @Column({ type: "int", nullable: true, default: null })
  email_template_id: number | null;

  @Column({ type: "int", nullable: true, default: null })
  whatsapp_template_id: number | null;

  /** YYYY-MM — last month a reminder was sent for */
  @Column({ type: "varchar", length: 10, nullable: true, default: null })
  last_reminder_period_key: string | null;

  @Column({ type: "timestamptz", nullable: true, default: null })
  last_reminder_sent_at: Date | null;

  /** YYYY-MM — last month a thank-you was sent for */
  @Column({ type: "varchar", length: 10, nullable: true, default: null })
  last_thanks_period_key: string | null;

  @Column({ type: "timestamptz", nullable: true, default: null })
  last_thanks_sent_at: Date | null;

  @Column({ type: "text", nullable: true, default: null })
  notes: string | null;

  /** recurring_monthly | prepaid_months */
  @Column({ type: "varchar", length: 30, default: "recurring_monthly" })
  pledge_mode: string;

  /** Number of months covered by a one-time prepaid pledge */
  @Column({ type: "int", nullable: true, default: null })
  prepaid_months: number | null;

  /** First month (YYYY-MM) covered by prepaid pledge */
  @Column({ type: "varchar", length: 10, nullable: true, default: null })
  prepaid_start_period_key: string | null;

  /** Last month (YYYY-MM) covered — no reminders in this range */
  @Column({ type: "varchar", length: 10, nullable: true, default: null })
  prepaid_end_period_key: string | null;

  @OneToMany(() => ManualRecurringPledgeLine, (line) => line.pledge)
  lines: ManualRecurringPledgeLine[];
}
