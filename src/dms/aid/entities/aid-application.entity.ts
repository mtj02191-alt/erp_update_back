import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../utils/base_utils/entities/baseEntity";
import { User } from "../../../users/user.entity";
import {
  AidApplicationStatus,
  AidCeoApprovalStatus,
  AidDeliveryStatus,
  AidRequestType,
  AidWriterRelation,
} from "../aid.enums";
import { AidHousehold } from "./aid-household.entity";
import { AidPerson } from "./aid-person.entity";

@Entity("aid_applications")
@Index("idx_aid_app_status", ["status"])
@Index("idx_aid_app_beneficiary", ["beneficiary_person_id"])
@Index("idx_aid_app_assigned", ["assigned_to_user_id"])
export class AidApplication extends BaseEntity {
  @Column({ type: "varchar", length: 40, unique: true })
  application_no: string;

  @Column({ type: "int" })
  beneficiary_person_id: number;

  @ManyToOne(() => AidPerson, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "beneficiary_person_id" })
  beneficiary: AidPerson;

  @Column({ type: "int", nullable: true, default: null })
  household_id: number | null;

  @ManyToOne(() => AidHousehold, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "household_id" })
  household: AidHousehold | null;

  @Column({ type: "int" })
  writer_person_id: number;

  @ManyToOne(() => AidPerson, { onDelete: "RESTRICT" })
  @JoinColumn({ name: "writer_person_id" })
  writer: AidPerson;

  @Column({
    type: "enum",
    enum: AidWriterRelation,
    default: AidWriterRelation.SELF,
  })
  writer_relation: AidWriterRelation;

  @Column({ type: "varchar", length: 200, nullable: true, default: null })
  title: string | null;

  @Column({ type: "text", nullable: true, default: null })
  request_summary: string | null;

  @Column({
    type: "enum",
    enum: AidRequestType,
    default: AidRequestType.OTHER,
  })
  requested_aid_type: AidRequestType;

  @Column({
    type: "enum",
    enum: AidApplicationStatus,
    default: AidApplicationStatus.SUBMITTED,
  })
  status: AidApplicationStatus;

  @Column({ type: "text", nullable: true, default: null })
  rejection_reason: string | null;

  @Column({ type: "text", nullable: true, default: null })
  verification_notes: string | null;

  /** Home-visit checklist answers (booleans by item key). No geo/photo in this phase. */
  @Column({ type: "jsonb", nullable: true, default: null })
  verification_checklist: Record<string, unknown> | null;

  /** Required when approving/verifying despite cooldown or same-year prior success. */
  @Column({ type: "text", nullable: true, default: null })
  leakage_override_reason: string | null;

  @Column({ type: "timestamptz", nullable: true, default: null })
  leakage_override_at: Date | null;

  @Column({ type: "int", nullable: true, default: null })
  leakage_override_by_id: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "leakage_override_by_id" })
  leakage_override_by: User | null;

  @Column({ type: "timestamptz", nullable: true, default: null })
  verified_at: Date | null;

  @Column({ type: "int", nullable: true, default: null })
  verified_by_id: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "verified_by_id" })
  verified_by: User | null;

  @Column({
    type: "enum",
    enum: AidCeoApprovalStatus,
    default: AidCeoApprovalStatus.NOT_REQUIRED,
  })
  ceo_approval_status: AidCeoApprovalStatus;

  @Column({ type: "text", nullable: true, default: null })
  ceo_rejection_reason: string | null;

  @Column({ type: "timestamptz", nullable: true, default: null })
  ceo_decided_at: Date | null;

  @Column({ type: "int", nullable: true, default: null })
  ceo_decided_by_id: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "ceo_decided_by_id" })
  ceo_decided_by: User | null;

  @Column({
    type: "enum",
    enum: AidDeliveryStatus,
    default: AidDeliveryStatus.NOT_STARTED,
  })
  delivery_status: AidDeliveryStatus;

  @Column({ type: "text", nullable: true, default: null })
  delivery_notes: string | null;

  @Column({ type: "timestamptz", nullable: true, default: null })
  delivered_at: Date | null;

  @Column({ type: "int", nullable: true, default: null })
  delivered_by_id: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "delivered_by_id" })
  delivered_by: User | null;

  @Column({ type: "int", nullable: true, default: null })
  assigned_to_user_id: number | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "assigned_to_user_id" })
  assigned_to: User | null;

  @Column({ type: "timestamptz", nullable: true, default: null })
  submitted_at: Date | null;
}
