import { BaseEntity } from "src/utils/base_utils/entities/baseEntity";
import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { DreamSchool } from "../../dream_schools/entities/dream_school.entity";

@Entity("dream_school_reports")
export class DreamSchoolReport extends BaseEntity {
  /** Groups lines created in one submit (like application report batches). */
  @Column({ type: "varchar", length: 36 })
  @Index()
  batch_id: string;

  /** Display month e.g. Jan-26 or 2026-01 */
  @Column({ type: "varchar", length: 32 })
  report_month: string;

  @Column({ type: "int", name: "dream_school_id" })
  dream_school_id: number;

  @ManyToOne(() => DreamSchool, { eager: false })
  @JoinColumn({ name: "dream_school_id" })
  dreamSchool: DreamSchool;

  @Column({ type: "int", default: 0 })
  visits: number;

  @Column({ type: "text", nullable: true })
  remarks: string;

  /** good | poor | excellent | medium */
  @Column({ type: "varchar", length: 20 })
  teacher_performance: string;
}
