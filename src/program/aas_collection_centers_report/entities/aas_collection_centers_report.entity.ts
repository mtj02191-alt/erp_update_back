import { BaseEntity } from "src/utils/base_utils/entities/baseEntity";
import { Column, Entity } from "typeorm";

export type CampWisePatientRow = {
  camp_name: string;
  patients: number;
};

@Entity("aas_collection_centers_reports")
export class AasCollectionCentersReport extends BaseEntity {
  @Column({ type: "int", name: "total_patients", default: 0 })
  total_patients: number;

  @Column({ type: "int", name: "tests_conducted", default: 0 })
  tests_conducted: number;

  @Column({ type: "int", name: "pending_tests", default: 0 })
  pending_tests: number;

  @Column({ type: "double precision", default: 0 })
  revenue: number;

  /** 0–100 */
  @Column({
    type: "double precision",
    name: "on_time_delivery_percent",
    default: 0,
  })
  on_time_delivery_percent: number;

  @Column({ type: "int", name: "total_camps", default: 0 })
  total_camps: number;

  @Column({ type: "jsonb", name: "camp_wise_patients", default: [] })
  camp_wise_patients: CampWisePatientRow[];
}
