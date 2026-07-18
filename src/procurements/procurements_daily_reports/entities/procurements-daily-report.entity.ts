import { User } from "src/users/user.entity";
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";

@Entity("procurements_daily_reports")
export class ProcurementsDailyReportEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "date" })
  date: Date;

  @Column({ type: "int", default: 0, nullable: true })
  total_generated_pos: number;

  @Column({ type: "int", default: 0, nullable: true })
  pending_pos: number;

  @Column({ type: "int", default: 0, nullable: true })
  fulfilled_pos: number;

  @Column({ type: "int", default: 0, nullable: true })
  total_generated_pis: number;

  @Column({
    type: "decimal",
    precision: 10,
    scale: 2,
    default: 0,
    nullable: true,
  })
  total_paid_amount: number;

  @Column({
    type: "decimal",
    precision: 10,
    scale: 2,
    default: 0,
    nullable: true,
  })
  unpaid_amount: number;

  @Column({ type: "int", default: 0, nullable: true })
  unpaid_pis: number;

  @Column({ type: "int", default: 0, nullable: true })
  tenders: number;

  @ManyToOne(() => User, (user) => user.id, {
    nullable: true,
    eager: false, // Disable eager loading (optional)
    onDelete: "SET NULL", // Optional
  })
  @JoinColumn({ name: "created_by" })
  created_by: User;

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: "boolean", default: false })
  is_archived: boolean;
}
