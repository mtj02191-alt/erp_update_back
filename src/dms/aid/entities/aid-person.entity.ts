import { Column, Entity } from "typeorm";
import { BaseEntity } from "../../../utils/base_utils/entities/baseEntity";
import {
  AidEducationLevel,
  AidMaritalStatus,
  AidPersonGender,
} from "../aid.enums";

@Entity("aid_people")
export class AidPerson extends BaseEntity {
  @Column({ type: "varchar", length: 200 })
  full_name: string;

  /** Unique when present; PostgreSQL allows multiple NULLs. */
  @Column({ type: "varchar", length: 15, nullable: true, unique: true, default: null })
  cnic: string | null;

  @Column({ type: "varchar", length: 30, nullable: true, default: null })
  phone: string | null;

  @Column({
    type: "enum",
    enum: AidPersonGender,
    nullable: true,
    default: null,
  })
  gender: AidPersonGender | null;

  @Column({ type: "date", nullable: true, default: null })
  date_of_birth: string | null;

  @Column({
    type: "enum",
    enum: AidMaritalStatus,
    nullable: true,
    default: null,
  })
  marital_status: AidMaritalStatus | null;

  @Column({ type: "varchar", length: 120, nullable: true, default: null })
  occupation: string | null;

  @Column({
    type: "enum",
    enum: AidEducationLevel,
    nullable: true,
    default: null,
  })
  education_level: AidEducationLevel | null;

  /** Approximate monthly household/personal income (PKR), optional. */
  @Column({ type: "numeric", precision: 12, scale: 2, nullable: true, default: null })
  monthly_income: string | null;

  @Column({ type: "boolean", default: true })
  is_alive: boolean;

  @Column({ type: "text", nullable: true, default: null })
  health_notes: string | null;

  @Column({ type: "text", nullable: true, default: null })
  address: string | null;

  @Column({ type: "varchar", length: 100, nullable: true, default: null })
  city: string | null;

  @Column({ type: "text", nullable: true, default: null })
  notes: string | null;

  @Column({ type: "boolean", default: true })
  is_active: boolean;
}
