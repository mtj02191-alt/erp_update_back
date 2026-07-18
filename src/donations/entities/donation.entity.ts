import { BaseEntity } from "src/utils/base_utils/entities/baseEntity";
import { Column, Entity, ManyToOne, JoinColumn, Index } from "typeorm";
import { Donor } from "../../dms/donor/entities/donor.entity";

//nullabe true to all column
@Entity("donations")
export class Donation extends BaseEntity {
  // Foreign key relationship to Donor
  @ManyToOne(() => Donor, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "donor_id" })
  donor: Donor;

  @Column({ nullable: true, default: null })
  donor_id: number;

  @Column({ type: "bigint", nullable: true, default: null })
  campaign_id: number | null;

  @Column({ type: "bigint", nullable: true, default: null })
  sub_program_id: number | null;

  @Column({ type: "bigint", nullable: true, default: null })
  event_id: number | null;

  @Column({ nullable: true, default: null })
  project_id: string;

  @Column({ type: "varchar", nullable: true, default: null })
  project_name: string;

  @Column({ type: "int", nullable: true, default: null })
  amount: number;

  @Column({ type: "int", nullable: true, default: null })
  paid_amount: number;
  //default current date and time
  @Column({ type: "date", default: () => "CURRENT_DATE", nullable: true })
  date: Date;

  //  currency
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

  // ⭐ NEW: Cheque payment fields
  @Column({ type: "varchar", nullable: true, default: null })
  cheque_number: string;

  @Column({ type: "varchar", nullable: true, default: null })
  bank_name: string;

  // Optional bank field for manual donation entries
  @Column({ type: "varchar", nullable: true, default: null })
  bank: string;

  // Optional transaction reference for manual donation entries
  @Column({ type: "varchar", nullable: true, default: null })
  transaction_id: string;

  // Order ID returned by the bank
  @Column({ type: "varchar", nullable: true, default: null })
  orderId: string;

  //   recurrence id in case of recurring donation and is returned by meezan bank
  @Column({ type: "int", nullable: true, default: null })
  recurrence_id: number;

  @Column({ type: "boolean", nullable: true, default: false })
  message_sent: boolean;

  @Column({ type: "boolean", nullable: true, default: false })
  email_sent: boolean;

  // for campaign tracking and agency performance monitoring
  @Column({ type: "varchar", nullable: true, default: null })
  ref: string;

  // Add note column  and noted_by also default nullable and have default null value
  @Column({ type: "text", nullable: true, default: null })
  note: string;

  @Column({ type: "int", nullable: true, default: null })
  noted_by: number;

  /** Optional: names for Qurbani / on-behalf dedications (free text). */
  @Column({ type: "text", nullable: true, default: null })
  on_behalf_names: string | null;
}
