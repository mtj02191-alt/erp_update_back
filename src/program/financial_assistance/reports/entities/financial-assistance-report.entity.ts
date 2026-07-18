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

@Entity("financial_assistance_reports")
export class FinancialAssistanceReport {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({ type: "date", name: "report_date" })
  report_date: Date;

  @Column({ type: "int", name: "widow", default: 0 })
  widow: number;

  @Column({ type: "int", name: "divorced", default: 0 })
  divorced: number;

  @Column({ type: "int", name: "disable", default: 0 })
  disable: number;

  @Column({ type: "int", name: "extreme_poor", default: 0 })
  extreme_poor: number;

  @Column({ type: "boolean", default: false })
  is_archived: boolean;

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
}
