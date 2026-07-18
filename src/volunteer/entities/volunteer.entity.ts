import { BaseEntity } from "src/utils/base_utils/entities/baseEntity";
import { Column, Entity } from "typeorm";

@Entity("volunteers")
export class Volunteer extends BaseEntity {
  // ─── Section 1: Personal Information ──────────────────────────
  @Column({ type: "varchar", nullable: true, default: null })
  name: string;

  @Column({ type: "varchar", nullable: true, default: null })
  email: string;

  @Column({ type: "varchar", nullable: true, default: null })
  phone: string;

  @Column({ type: "varchar", nullable: true, default: null })
  cnic: string;

  @Column({ type: "date", nullable: true, default: null })
  date_of_birth: Date;

  @Column({ type: "varchar", nullable: true, default: null })
  gender: string;

  @Column({ type: "varchar", nullable: true, default: null })
  city: string;

  @Column({ type: "varchar", nullable: true, default: null })
  area: string;

  // ─── Section 2: Availability & Commitment ─────────────────────
  @Column({ type: "varchar", nullable: true, default: null })
  availability: string;

  @Column({ type: "simple-json", nullable: true, default: null })
  availability_days: string[];

  @Column({ type: "varchar", nullable: true, default: null })
  hours_per_week: string;

  @Column({ type: "boolean", nullable: true, default: null })
  willing_to_travel: boolean;

  @Column({ type: "varchar", nullable: true, default: null })
  schedule: string;

  // ─── Section 3: Skills & Interest ─────────────────────────────
  @Column({ type: "simple-json", nullable: true, default: null })
  skills: string[];

  @Column({ type: "simple-json", nullable: true, default: null })
  interest_areas: string[];

  @Column({ type: "varchar", nullable: true, default: null })
  category: string;

  @Column({ type: "text", nullable: true, default: null })
  motivation: string;

  @Column({ type: "varchar", nullable: true, default: null })
  cv_url: string;

  // ─── Section 4: Emergency Contact ─────────────────────────────
  @Column({ type: "varchar", nullable: true, default: null })
  emergency_contact_name: string;

  @Column({ type: "varchar", nullable: true, default: null })
  emergency_contact_phone: string;

  @Column({ type: "varchar", nullable: true, default: null })
  emergency_contact_relation: string;

  // ─── ERP / Admin Fields ───────────────────────────────────────
  @Column({ type: "varchar", nullable: true, default: "pending" })
  status: string;

  @Column({ type: "varchar", nullable: true, default: null })
  assigned_department: string;

  @Column({ type: "boolean", nullable: true, default: false })
  interview_required: boolean;

  @Column({ type: "varchar", nullable: true, default: "unverified" })
  verification_status: string;

  // ─── Agreements ───────────────────────────────────────────────
  @Column({ type: "boolean", nullable: true, default: false })
  agreed_to_policy: boolean;

  @Column({ type: "boolean", nullable: true, default: false })
  declaration_accurate: boolean;

  // ─── Existing fields ─────────────────────────────────────────
  @Column({ type: "text", nullable: true, default: null })
  comments: string;

  @Column({ type: "varchar", nullable: true, default: null })
  source: string;
}
