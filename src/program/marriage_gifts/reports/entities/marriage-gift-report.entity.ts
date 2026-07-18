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

@Entity("marriage_gift_reports")
export class MarriageGiftReport {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({ type: "date", name: "report_date" })
  report_date: Date;

  @Column({ type: "int", name: "orphans", default: 0 })
  orphans: number;

  @Column({ type: "int", name: "divorced", default: 0 })
  divorced: number;

  @Column({ type: "int", name: "disable", default: 0 })
  disable: number;

  @Column({ type: "int", name: "indegent", default: 0 })
  indegent: number;

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
