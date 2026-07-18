import { Entity, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../utils/base_utils/entities/baseEntity";
import { ProgressWorkflowTemplate } from "../progress_workflow_templates/progress_workflow_template.entity";

@Entity("progress_workflow_batches")
@Index(["template_id", "batch_number"], { unique: true })
export class ProgressWorkflowBatch extends BaseEntity {
  @ManyToOne(() => ProgressWorkflowTemplate, { onDelete: "CASCADE" })
  @JoinColumn({ name: "template_id" })
  template: ProgressWorkflowTemplate;

  @Column({ type: "bigint" })
  template_id: number;

  /** Auto-incrementing per template (1,2,3,...) */
  @Column({ type: "int" })
  batch_number: number;

  /** Total parts in this batch (copied from template at creation time) */
  @Column({ type: "int" })
  batch_parts: number;

  /** Amount per part (copied from template at creation time) */
  @Column({ type: "bigint" })
  batch_part_amount: number;

  /** How many parts have been allocated to donations so far */
  @Column({ type: "int", default: 0 })
  allocated_parts: number;

  /** When true, no more parts can be allocated */
  @Column({ default: false })
  is_closed: boolean;

  /** Physical / reference tag id (shared by all donations on this batch) */
  @Column({ type: "varchar", length: 120, nullable: true })
  tag_number: string | null;

  /** Optional display / descriptive name for the batch tag */
  @Column({ type: "varchar", length: 255, nullable: true })
  tag_name: string | null;
}
