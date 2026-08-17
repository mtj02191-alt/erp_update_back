import { Entity, Column } from "typeorm";
import { BaseEntity } from "../../../../utils/base_utils/entities/baseEntity";
import { Department } from "../../../../users/user.entity";

@Entity("hr_resume_collections")
export class ResumeCollection extends BaseEntity {
  @Column({ name: "applicant_name", type: "varchar", length: 255, nullable: true })
  applicant_name: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  phone: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  email: string | null;

  @Column({ type: "varchar", length: 20, nullable: true })
  cnic: string | null;

  @Column({ type: "varchar", length: 500, nullable: true })
  address: string | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  city: string | null;

  @Column({ type: "varchar", length: 255, nullable: true })
  role: string | null;

  @Column({ type: "text", nullable: true })
  experience: string | null;

  @Column({ type: "text", nullable: true })
  education: string | null;

  @Column({
    type: "enum",
    enum: Department,
    nullable: true,
  })
  department: Department | null;

  @Column({ name: "resume_url", type: "varchar", length: 1000, nullable: true })
  resume_url: string | null;

  @Column({ name: "resume_file_key", type: "varchar", length: 500, nullable: true })
  resume_file_key: string | null;

  @Column({ name: "original_filename", type: "varchar", length: 255, nullable: true })
  original_filename: string | null;

  @Column({ type: "text", nullable: true })
  notes: string | null;
}
