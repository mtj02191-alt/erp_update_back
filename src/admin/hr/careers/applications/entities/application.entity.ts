import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "src/utils/base_utils/entities/baseEntity";
import { Job } from "../../jobs/entities/job.entity";

@Entity("job_applications")
export class Application extends BaseEntity {
  @Column({
    name: "applicant_name",
    type: "varchar",
    length: 255,
    nullable: true,
  })
  applicant_name: string;

  @Column({ name: "email", type: "varchar", length: 255, nullable: true })
  email: string;

  @Column({ name: "phone_number", type: "varchar", length: 20, nullable: true })
  phone_number: string;

  @Column({ name: "resume_url", type: "varchar", length: 500, nullable: true })
  resume_url: string;

  @Column({ name: "cover_letter", type: "text", nullable: true })
  cover_letter: string;

  @Column({ name: "job_id", type: "int", nullable: true })
  job_id: number;

  // Relationship
  // @ManyToOne(() => Job, (job) => job.applications, { nullable: true, onDelete: 'CASCADE' })
  // @JoinColumn({ name: 'job_id' })
  // job: Job;
}
