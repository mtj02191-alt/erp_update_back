import {
  Entity,
  Column,
  Index,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from "typeorm";
import { BaseEntity } from "../../utils/base_utils/entities/baseEntity";
import { ProgressWorkflowTemplateStep } from "./progress_workflow_template_step.entity";
import { ProgressTracker } from "../progress_trackers/progress_tracker.entity";

@Entity("progress_workflow_templates")
export class ProgressWorkflowTemplate extends BaseEntity {
  @Column({ unique: true })
  name: string;

  @Column({ unique: true })
  code: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ type: "bigint", nullable: true })
  program_id: number; // Nullable if not tied to a specific program

  /** Optional parent template (template tree) */
  @ManyToOne(() => ProgressWorkflowTemplate, (t) => t.children, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "parent_id" })
  parent: ProgressWorkflowTemplate;

  @Column({ type: "bigint", nullable: true })
  parent_id: number | null;

  @OneToMany(() => ProgressWorkflowTemplate, (t) => t.parent)
  children: ProgressWorkflowTemplate[];

  /** Reporting / goal tracking */
  @Column({ type: "bigint", nullable: true })
  target_amount: number | null;

  /** Batching (shares/parts) */
  @Column({ default: false })
  is_batchable: boolean;

  @Column({ type: "int", nullable: true })
  batch_parts: number | null;

  @Column({ type: "bigint", nullable: true })
  batch_part_amount: number | null;

  @Column({ default: true })
  is_active: boolean;

  @OneToMany(() => ProgressWorkflowTemplateStep, (step) => step.template)
  steps: ProgressWorkflowTemplateStep[];

  @OneToMany(() => ProgressTracker, (tracker) => tracker.template)
  trackers: ProgressTracker[];
}
