import { Entity, Column, Index, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../utils/base_utils/entities/baseEntity";
import { ProgressWorkflowTemplate } from "./progress_workflow_template.entity";

@Entity("progress_workflow_template_steps")
@Index(["template_id", "step_key"], { unique: true })
export class ProgressWorkflowTemplateStep extends BaseEntity {
  @ManyToOne(() => ProgressWorkflowTemplate, (template) => template.steps, {
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "template_id" })
  template: ProgressWorkflowTemplate;

  @Column({ type: "bigint" })
  template_id: number;

  @Column()
  step_key: string;

  @Column()
  title: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column()
  step_order: number;

  @Column({ default: true })
  is_required: boolean;

  @Column({ default: false })
  allow_evidence: boolean;

  @Column({ default: false })
  allow_notes: boolean;

  @Column({ default: false })
  allow_metadata: boolean;

  @Column({ type: "jsonb", nullable: true })
  metadata_schema: object; // JSON schema for step-specific metadata

  @Column({ default: false })
  notify_donor_on_complete: boolean;
}
