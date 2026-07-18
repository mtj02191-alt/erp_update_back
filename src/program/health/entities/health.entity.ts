import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "../../../users/user.entity";

@Entity("health_reports")
export class HealthReport {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "date", nullable: false })
  date: Date;

  @Column({ type: "varchar", length: 50, nullable: false })
  type: string; // In-house, Referred, Surgeries Supported, Ambulance, Medicines

  @Column({ type: "int", default: 0 })
  widows: number;

  @Column({ type: "int", default: 0 })
  divorced: number;

  @Column({ type: "int", default: 0 })
  disable: number;

  @Column({ type: "int", default: 0 })
  indegent: number;

  @Column({ type: "int", default: 0 })
  orphans: number;

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

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: "boolean", default: false })
  is_archived: boolean;
}
