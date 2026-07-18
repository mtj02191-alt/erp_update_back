import { User } from "../../../users/user.entity";
import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";

@Entity("store_daily_reports")
export class StoreDailyReportEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "date" })
  date: Date;

  @Column({ type: "int", default: 0, nullable: true })
  generated_demands: number;

  @Column({ type: "int", default: 0 })
  pending_demands: number;

  @Column({ type: "int", default: 0 })
  generated_grn: number;

  @Column({ type: "int", default: 0 })
  pending_grn: number;

  @Column({ type: "int", default: 0 })
  rejected_demands: number;

  @Column({ type: "boolean", default: false })
  is_archived: boolean;

  @ManyToOne(() => User, (user) => user.id, {
    nullable: true,
    eager: false, // Disable eager loading (optional)
    onDelete: "SET NULL", // Optional
  })
  @JoinColumn({ name: "created_by" })
  created_by: User;

  @CreateDateColumn()
  created_at: Date;
}
