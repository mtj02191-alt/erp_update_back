import { BaseEntity } from "src/utils/base_utils/entities/baseEntity";
import { Column, Entity, ManyToOne, JoinColumn } from "typeorm";
import { Donor } from "src/dms/donor/entities/donor.entity";

/**
 * Legacy recurring plan (Meezan / bank gateways).
 * Stripe subscriptions use `recurring_donations` ledger instead.
 * Linked from donations.recurrence_id when a legacy plan row is created.
 */
@Entity("recurring_donation_plans")
export class RecurringDonationPlan extends BaseEntity {
  @ManyToOne(() => Donor, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "donor_id" })
  donor: Donor;

  @Column({ nullable: true, default: null })
  donor_id: number;

  @Column({ nullable: true, default: null })
  project_id: string;

  @Column({ type: "varchar", nullable: true, default: null })
  project_name: string;

  @Column({ type: "int", nullable: true, default: null })
  amount: number;

  @Column({ type: "int", nullable: true, default: null })
  paid_amount: number;

  @Column({ type: "date", default: () => "CURRENT_DATE", nullable: true })
  date: Date;

  @Column({ type: "varchar", nullable: true, default: null })
  currency: string;

  @Column({ type: "varchar", nullable: true, default: null })
  donation_type: string;

  @Column({ type: "varchar", nullable: true, default: null })
  donation_method: string;

  @Column({ type: "varchar", nullable: true, default: null })
  donation_source: string;

  @Column({ type: "varchar", nullable: true, default: null })
  country: string;

  @Column({ type: "varchar", nullable: true, default: null })
  city: string;

  @Column({ type: "varchar", nullable: true, default: "pending" })
  status: string;

  @Column({ type: "varchar", nullable: true, default: null })
  err_msg: string;

  /** Order ID returned by the bank */
  @Column({ type: "varchar", nullable: true, default: null })
  orderId: string;

  /** Recurrence id returned by Meezan bank */
  @Column({ type: "varchar", nullable: true, default: null })
  recurrence_id: string;

  @Column({ type: "boolean", nullable: true, default: false })
  message_sent: boolean;

  @Column({ type: "boolean", nullable: true, default: false })
  email_sent: boolean;
}
