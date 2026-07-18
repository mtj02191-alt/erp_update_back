import { BaseEntity } from "src/utils/base_utils/entities/baseEntity";
import { Column, Entity } from "typeorm";

@Entity("al_hasanain_clg")
export class AlHasanainClg extends BaseEntity {
  @Column({ type: "int", name: "total_students", default: 0 })
  total_students: number;

  /** 0–100 */
  @Column({ type: "double precision", name: "attendance_percent", default: 0 })
  attendance_percent: number;

  /** 0–100 dropout rate */
  @Column({ type: "double precision", name: "dropout_rate", default: 0 })
  dropout_rate: number;

  /** 0–100 */
  @Column({ type: "double precision", name: "pass_rate", default: 0 })
  pass_rate: number;

  @Column({ type: "double precision", name: "fee_collection", default: 0 })
  fee_collection: number;

  @Column({ type: "int", name: "active_teachers", default: 0 })
  active_teachers: number;
}
