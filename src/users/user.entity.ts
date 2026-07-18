import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  OneToOne,
  ManyToMany,
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
  AAS_LAB = "aas_lab",
}

@Entity()
export class User {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ unique: true })
  email: string;

  @Column()
  password: string;

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

  // One-to-One relationship with permissions
  @OneToOne(() => PermissionsEntity, (permissions) => permissions.user)
  permissions: PermissionsEntity;

  // Many-to-Many relationship with donation boxes
  @ManyToMany(() => DonationBox, (donationBox) => donationBox.assignedUsers)
  donationBoxes: DonationBox[];

  @Column({ name: "is_archived", type: "boolean", default: false })
  is_archived: boolean;
}
