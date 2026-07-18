import { BaseEntity } from "src/utils/base_utils/entities/baseEntity";
import { Entity, Column, Index, OneToMany } from "typeorm";
import { Application } from "../../applications/entities/application.entity";

export enum JobType {
  FULL_TIME = "Full Time",
  PART_TIME = "Part Time",
  CONTRACT = "Contract",
}

export enum JobStatus {
  ACTIVE = "active",
  CLOSED = "closed",
  DRAFT = "draft",
}

@Entity("jobs")
@Index("idx_jobs_status", ["status"])
@Index("idx_jobs_type", ["type"])
@Index("idx_jobs_location", ["location"])
@Index("idx_jobs_posted_date", ["posted_date"])
@Index("idx_jobs_slug", ["slug"], { unique: true })
export class Job extends BaseEntity {
  @Column({ type: "varchar", length: 255 })
  title: string;

  @Column({ type: "varchar", length: 255, unique: true })
  slug: string;

  @Column({ type: "varchar", length: 500, nullable: true })
  icon: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  department: string;

  @Column({
    type: "enum",
    enum: JobType,
    nullable: true,
  })
  type: JobType;

  @Column({ type: "varchar", length: 255, nullable: true })
  location: string;

  @Column({ type: "text", nullable: true })
  about: string;

  @Column({ type: "json", nullable: true })
  qualifications: string[];

  @Column({ type: "json", nullable: true })
  responsibilities: string[];

  @Column({
    type: "enum",
    enum: JobStatus,
    default: JobStatus.ACTIVE,
    nullable: true,
  })
  status: JobStatus;

  @Column({ type: "boolean", default: false })
  is_featured: boolean;

  @Column({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  posted_date: Date;

  @Column({ type: "timestamp", nullable: true })
  closing_date: Date;

  @Column("text", { array: true, nullable: true })
  experience?: string[];

  @Column("text", { array: true, nullable: true })
  skills?: string[];

  // // Relationships
  // @OneToMany(() => Application, (application) => application.job, { eager: false })
  // applications: Application[];
}
