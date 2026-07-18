import { Entity, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../utils/base_utils/entities/baseEntity";
import { Donation } from "../../donations/entities/donation.entity";
import { ProgressWorkflowTemplate } from "../progress_workflow_templates/progress_workflow_template.entity";
import { ProgressWorkflowBatch } from "./progress_workflow_batch.entity";

@Entity("donation_batch_allocations")
@Index(["donation_id", "batch_id"], { unique: false })
export class DonationBatchAllocation extends BaseEntity {
  @ManyToOne(() => Donation, { onDelete: "CASCADE" })
  @JoinColumn({ name: "donation_id" })
  donation: Donation;

  @Column({ type: "bigint" })
  donation_id: number;

  @ManyToOne(() => ProgressWorkflowTemplate, { onDelete: "CASCADE" })
  @JoinColumn({ name: "template_id" })
  template: ProgressWorkflowTemplate;

  @Column({ type: "bigint" })
  template_id: number;

  @ManyToOne(() => ProgressWorkflowBatch, { onDelete: "CASCADE" })
  @JoinColumn({ name: "batch_id" })
  batch: ProgressWorkflowBatch;

  @Column({ type: "bigint" })
  batch_id: number;

  /** Denormalized for easier reporting */
  @Column({ type: "int" })
  batch_number: number;

  /** Part numbering within a batch is 1..batch_parts */
  @Column({ type: "int" })
  part_start: number;

  @Column({ type: "int" })
  part_end: number;

  @Column({ type: "int" })
  parts_count: number;

  @Column({ type: "bigint" })
  part_amount: number;

  @Column({ type: "bigint" })
  total_amount: number;
}
