import { Entity, Column, ManyToOne, JoinColumn, Index } from "typeorm";
import { BaseEntity } from "../../../../utils/base_utils/entities/baseEntity";
import { DonationBox } from "../../entities/donation-box.entity";
import { User } from "../../../../users/user.entity";

export enum CollectionStatus {
  PENDING = "pending",
  VERIFIED = "verified",
  DEPOSITED = "deposited",
  CANCELLED = "cancelled",
}

export enum PaymentMethod {
  CASH = "cash",
  CHEQUE = "cheque",
  BANK_TRANSFER = "bank_transfer",
  OTHER = "other",
}

@Entity("donation_box_donations")
// @Index('idx_donation_box_id', ['donation_box_id'])
// // @Index('idx_collection_date', ['collection_date'])
// @Index('idx_status', ['status'])
// @Index('idx_collected_by', ['collected_by_id'])
export class DonationBoxDonation extends BaseEntity {
  // Foreign key relationship to DonationBox
  @ManyToOne(() => DonationBox, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "donation_box_id" })
  donation_box: DonationBox;

  @Column()
  donation_box_id: number;

  // Collection Details
  @Column({ type: "decimal", precision: 10, scale: 2 })
  collection_amount: number;

  @Column({ type: "date" })
  collection_date: Date;

  // Collector Information
  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "collected_by_id" })
  collected_by: User;

  @Column({ nullable: true })
  collected_by_id: number;

  @Column({ nullable: true })
  collector_name: string;

  // Verification & Deposit
  @Column({
    type: "enum",
    enum: CollectionStatus,
    default: CollectionStatus.PENDING,
  })
  status: CollectionStatus;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "verified_by_id" })
  verified_by: User;

  @Column({ nullable: true })
  verified_by_id: number;

  @Column({ type: "timestamp", nullable: true })
  verified_at: Date;

  @Column({ type: "date", nullable: true })
  deposit_date: Date;

  @Column({ nullable: true })
  bank_deposit_slip_no: string;

  // Payment Details
  @Column({
    type: "enum",
    enum: PaymentMethod,
    default: PaymentMethod.CASH,
  })
  payment_method: PaymentMethod;

  @Column({ nullable: true })
  cheque_number: string;

  @Column({ nullable: true })
  bank_name: string;

  @Column({ nullable: true })
  bank_account_no: string;

  // Additional Information
  @Column({ type: "text", nullable: true })
  notes: string;

  @Column({ type: "text", nullable: true })
  discrepancy_notes: string;

  // Photos/Evidence
  @Column({ type: "json", nullable: true })
  photo_urls: string[];

  @Column({ nullable: true })
  receipt_number: string;
}
