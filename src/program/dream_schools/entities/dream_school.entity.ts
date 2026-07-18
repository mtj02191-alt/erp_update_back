import { BaseEntity } from "src/utils/base_utils/entities/baseEntity";
import { Column, Entity, Unique } from "typeorm";

@Entity("dream_schools")
@Unique(["school_code"])
export class DreamSchool extends BaseEntity {
  /** Human-readable id, e.g. MTJF-EDU/DS-25-02 */
  @Column({ type: "varchar", length: 64 })
  school_code: string;

  @Column({ type: "int", name: "student_count", default: 0 })
  student_count: number;

  @Column({ type: "varchar", length: 500 })
  location: string;

  @Column({ type: "varchar", length: 100, name: "kawish_id" })
  kawish_id: string;
}
