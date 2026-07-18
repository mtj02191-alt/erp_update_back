import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "../../../../users/user.entity";

@Entity("ration_reports")
export class RationReport {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({ type: "date", name: "report_date" })
  report_date: Date;

  @Column({ type: "boolean", name: "is_alternate", default: false })
  is_alternate: boolean;

  @Column({ type: "int", name: "full_widows", default: 0 })
  full_widows: number;

  @Column({ type: "int", name: "full_divorced", default: 0 })
  full_divorced: number;

  @Column({ type: "int", name: "full_disable", default: 0 })
  full_disable: number;

  @Column({ type: "int", name: "full_indegent", default: 0 })
  full_indegent: number;

  @Column({ type: "int", name: "full_orphan", default: 0 })
  full_orphan: number;

  @Column({ type: "int", name: "half_widows", default: 0 })
  half_widows: number;

  @Column({ type: "int", name: "half_divorced", default: 0 })
  half_divorced: number;

  @Column({ type: "int", name: "half_disable", default: 0 })
  half_disable: number;

  @Column({ type: "int", name: "half_indegent", default: 0 })
  half_indegent: number;

  @Column({ type: "int", name: "half_orphan", default: 0 })
  half_orphan: number;

  @Column({ type: "int", name: "life_time", default: 0 })
  /** Rollup: sum of all life_time_full_* + life_time_half_* (set on save). */
  life_time: number;

  @Column({ type: "int", name: "life_time_full_widows", default: 0 })
  life_time_full_widows: number;

  @Column({ type: "int", name: "life_time_full_divorced", default: 0 })
  life_time_full_divorced: number;

  @Column({ type: "int", name: "life_time_full_disable", default: 0 })
  life_time_full_disable: number;

  @Column({ type: "int", name: "life_time_full_indegent", default: 0 })
  life_time_full_indegent: number;

  @Column({ type: "int", name: "life_time_full_orphan", default: 0 })
  life_time_full_orphan: number;

  @Column({ type: "int", name: "life_time_half_widows", default: 0 })
  life_time_half_widows: number;

  @Column({ type: "int", name: "life_time_half_divorced", default: 0 })
  life_time_half_divorced: number;

  @Column({ type: "int", name: "life_time_half_disable", default: 0 })
  life_time_half_disable: number;

  @Column({ type: "int", name: "life_time_half_indegent", default: 0 })
  life_time_half_indegent: number;

  @Column({ type: "int", name: "life_time_half_orphan", default: 0 })
  life_time_half_orphan: number;

  @ManyToOne(() => User, (user) => user.id, {
    nullable: true,
    eager: false,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "created_by" })
  created_by: User;

  @ManyToOne(() => User, (user) => user.id, {
    nullable: true,
    eager: false,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "updated_by" })
  updated_by: User;

  @CreateDateColumn({
    name: "created_at",
    type: "timestamp",
    precision: 6,
    default: () => "CURRENT_TIMESTAMP",
  })
  created_at: Date;

  @UpdateDateColumn({
    name: "updated_at",
    type: "timestamp",
    precision: 6,
    default: () => "CURRENT_TIMESTAMP",
  })
  updated_at: Date;

  @Column({ type: "boolean", default: false })
  is_archived: boolean;
}
