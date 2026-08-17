import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  ManyToOne,
  ManyToMany,
  JoinColumn,
  UpdateDateColumn,
} from "typeorm";
import { PermissionsEntity } from "../permissions/entities/permissions.entity";
import { DonationBox } from "../dms/donation_box/entities/donation-box.entity";

export enum UserRole {
  SUPER_ADMIN = "super_admin",
  ADMIN = "admin",
  USER = "user",
  MANAGER = "manager",
  ASSISTANT_MANAGER = "assistant_manager",
  OFFICER = "officer",
  COORDINATOR = "coordinator",
  SUPPORT = "support",
  ANALYST = "analyst",
  DEVELOPER = "developer",
  SYSTEM_ADMIN = "system_admin",
  IT_SUPPORT = "it_support",
  TEAM_LEAD = "team_lead",
  STAFF = "staff",
  FIELD_OFFICER = "field_officer",
  VOLUNTEER = "volunteer",
  DEPT_HEAD = "dept_head",
  ASST_CRD_OFFICER = "asst_crd_officer",
  CRD_OFFICER = "crd_officer",
  INTERNEE = "internee",
  // Fund raising department roles
  FUNDRAISER = "fundraiser",
  DONOR_RELATIONS_OFFICER = "donor_relations_officer",
  CSR = "csr",
  RECONCILE_AGENT = "reconcile_agent",
  BACK_OFFICE_CLERK = "back_office_clerk",
  CALL_CENTER_AGENT = "call_center_agent",
  CEO = "ceo",
  PA = "pa",
}

export enum Department {
  STORE = "store",
  PROCUREMENTS = "procurements",
  PROGRAM = "program",
  ACCOUNTS_AND_FINANCE = "accounts_and_finance",
  ADMIN = "admin",
  FUND_RAISING = "fund_raising",
  IT = "it",
  HR = "hr",
  MARKETING = "marketing",
  AUDIO_VIDEO = "audio_video",
  MEAL = "meal",
  HEALTH = "health",
  EXECUTIVE_OFFICE = "executive_office",
  CEO = "ceo",
  INTERNAL_AUDIT = "internal_audit",
  CRD = "crd",
  AAS_LAB = "aas_lab"
}

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

  // Encrypted copy for admin reveal (same vault as donor passwords).
  @Column({ type: "text", nullable: true })
  password_enc: string | null;

  @Column({ type: "int", default: 0 })
  password_enc_version: number;

  @Column({ type: "timestamp", nullable: true })
  password_last_revealed_at: Date | null;

  @Column({ type: "int", default: 0 })
  password_reveal_count: number;

  @Column({
    type: "enum",
    enum: UserRole,
    default: UserRole.USER,
  })
  role: UserRole;

  @Column({
    type: "enum",
    enum: Department,
  })
  department: Department;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  created_at: Date;

  @UpdateDateColumn({
    name: "updatedAt",
    type: "timestamp",
    precision: 6,
    default: () => "CURRENT_TIMESTAMP",
  })
  updatedAt: Date;

  // Password reset fields
  @Column({ nullable: true })
  resetToken: string;

  @Column({ nullable: true })
  resetTokenExpiry: Date;

  /** Calendar day (YYYY-MM-DD) for forgot-password rate limiting. */
  @Column({ name: "password_reset_day", type: "date", nullable: true })
  password_reset_day: string | null;

  @Column({ name: "password_reset_count", type: "int", default: 0 })
  password_reset_count: number;

  // New fields in snake_case
  @Column({ name: "first_name", nullable: true })
  first_name: string;

  @Column({ name: "last_name", nullable: true })
  last_name: string;

  @Column({ name: "phone", nullable: true })
  phone: string;

  @Column({ name: "dob", type: "date", nullable: true })
  dob: string;

  @Column({ name: "address", nullable: true })
  address: string;

  @Column({ name: "cnic", nullable: true })
  cnic: string;

  @Column({ name: "gender", nullable: true })
  gender: string;

  @Column({ name: "joining_date", type: "date", nullable: true })
  joining_date: string;

  @Column({ name: "emergency_contact", nullable: true })
  emergency_contact: string;

  @Column({ name: "blood_group", nullable: true })
  blood_group: string;

  // Geographic assignment fields (for fund_raising department)
  @Column({
    name: "assigned_countries",
    type: "jsonb",
    nullable: true,
    default: null,
  })
  assigned_countries: number[];

  @Column({
    name: "assigned_regions",
    type: "jsonb",
    nullable: true,
    default: null,
  })
  assigned_regions: number[];

  @Column({
    name: "assigned_districts",
    type: "jsonb",
    nullable: true,
    default: null,
  })
  assigned_districts: number[];

  @Column({
    name: "assigned_tehsils",
    type: "jsonb",
    nullable: true,
    default: null,
  })
  assigned_tehsils: number[];

  @Column({
    name: "assigned_cities",
    type: "jsonb",
    nullable: true,
    default: null,
  })
  assigned_cities: number[];

  @Column({
    name: "assigned_routes",
    type: "jsonb",
    nullable: true,
    default: null,
  })
  assigned_routes: number[];

  /** When true, fund_raising DMS geographic filters are not applied (permissions still apply). */
  @Column({ name: "geographic_off", type: "boolean", default: false })
  geographic_off: boolean;

  @Column({ name: "manager_id", type: "int", nullable: true })
  manager_id: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "manager_id" })
  manager: User;

  // One-to-One relationship with permissions
  @OneToOne(() => PermissionsEntity, (permissions) => permissions.user)
  permissions: PermissionsEntity;

  // Many-to-Many relationship with donation boxes
  @ManyToMany(() => DonationBox, (donationBox) => donationBox.assignedUsers)
  donationBoxes: DonationBox[];

  @Column({ name: "is_archived", type: "boolean", default: false })
  is_archived: boolean;
}
