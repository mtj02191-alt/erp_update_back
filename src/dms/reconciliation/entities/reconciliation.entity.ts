import { Entity, Column } from "typeorm";
import { BaseEntity } from "../../../utils/base_utils/entities/baseEntity";

export type ReconciliationRowResult = {
  rowIndex: number;
  serialNo?: string;
  tranSeqNo?: string;
  status: "created" | "skipped" | "failed";
  reason?: string;
  donationId?: number;
  donorId?: number;
};

@Entity("reconciliations")
export class Reconciliation extends BaseEntity {
  @Column({ type: "varchar", length: 64 })
  bank_name: string;

  @Column({ type: "text" })
  file_url: string;

  @Column({ type: "varchar", nullable: true, default: null })
  file_key: string | null;

  @Column({ type: "varchar", nullable: true, default: null })
  original_filename: string | null;

  @Column({ type: "date", nullable: true, default: null })
  statement_from: Date | null;

  @Column({ type: "date", nullable: true, default: null })
  statement_to: Date | null;

  @Column({ type: "int", default: 0 })
  total_credit_rows: number;

  @Column({ type: "int", default: 0 })
  skipped_non_credit: number;

  @Column({ type: "int", default: 0 })
  skipped_meta_rows: number;

  @Column({ type: "int", default: 0 })
  created_count: number;

  @Column({ type: "int", default: 0 })
  skipped_count: number;

  @Column({ type: "int", default: 0 })
  failed_count: number;

  @Column({ type: "json", nullable: true, default: null })
  row_results: ReconciliationRowResult[] | null;

  @Column({ type: "text", nullable: true, default: null })
  notes: string | null;
}
