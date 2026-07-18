import { Entity, Column, OneToMany, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../utils/base_utils/entities/baseEntity";
import { User } from "src/users/user.entity";

export enum DonorType {
  INDIVIDUAL = "individual",
  CSR = "csr", // Corporate Social Responsibility
}

@Entity("donors")
export class Donor extends BaseEntity {
  // Relationship to Donations (one donor can have many donations)
  @OneToMany("Donation", "donor")
  donations: any[];

  @ManyToOne(() => User, (user) => user.id, {
    nullable: true,
    eager: false,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "assigned_to" })
  assigned_to: User;

  @ManyToOne(() => User, (user) => user.id, {
    nullable: true,
    eager: false,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "referred_by" })
  referred_by: User;

  // Common fields for all donors
  @Column({
    type: "enum",
    enum: DonorType,
    default: DonorType.INDIVIDUAL,
  })
  donor_type: DonorType;

  @Column({ unique: true })
  email: string;

  @Column({ nullable: true })
  password: string;

  // Encrypted copy of password for on-demand delivery (Option C).
  // Stored as AES-256-GCM payload: iv.tag.ciphertext (base64, dot-separated).
  @Column({ type: "text", nullable: true })
  password_enc: string;

  @Column({ type: "int", default: 0 })
  password_enc_version: number;

  @Column({ type: "timestamp", nullable: true })
  password_last_revealed_at: Date;

  @Column({ type: "int", default: 0 })
  password_reveal_count: number;

  @Column()
  phone: string;

  @Column({ nullable: true })
  cnic: string;

  @Column({ nullable: true, default: "website" })
  source: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  city: string;

  @Column({ nullable: true })
  country: string;

  @Column({ nullable: true })
  postal_code: string;

  @Column({ type: "text", nullable: true })
  notes: string;

  @Column({ default: true })
  is_active: boolean;

  // Individual Donor fields
  @Column({ nullable: true })
  name: string; // Full name for individual

  @Column({ nullable: true })
  first_name: string;

  @Column({ nullable: true })
  last_name: string;

  // CSR/Corporate Donor fields
  @Column({ nullable: true })
  company_name: string;

  @Column({ nullable: true })
  company_registration: string;

  @Column({ nullable: true })
  contact_person: string;

  @Column({ nullable: true })
  designation: string;

  @Column({ nullable: true })
  company_address: string;

  @Column({ nullable: true })
  company_phone: string;

  @Column({ nullable: true })
  company_email: string;

  // Password reset fields
  @Column({ nullable: true })
  reset_token: string;

  @Column({ nullable: true, type: "timestamp" })
  reset_token_expiry: Date;

  // Additional tracking fields
  @Column({ type: "decimal", precision: 10, scale: 2, default: 0 })
  total_donated: number;

  @Column({ type: "int", default: 0 })
  donation_count: number;

  @Column({ nullable: true, type: "timestamp" })
  last_donation_date: Date;

  @Column({ type: "boolean", default: false, nullable: true })
  is_archived: boolean;

  @Column({ type: "boolean", default: false, nullable: true })
  recurring: boolean;

  @Column({ type: "boolean", default: false, nullable: true })
  multi_time_donor: boolean;

  @Column({ type: "boolean", default: true, nullable: true })
  notification_subscription: boolean;
}
