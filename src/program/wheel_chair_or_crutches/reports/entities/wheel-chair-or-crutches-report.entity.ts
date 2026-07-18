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

@Entity("wheel_chair_or_crutches_reports")
export class WheelChairOrCrutchesReport {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "date", nullable: false })
  date: Date;

  @Column({ type: "varchar", length: "50", nullable: false })
  type: string; // 'Wheel Chair' or 'Crutches'

  @Column({ type: "varchar", length: "20", nullable: false })
  gender: string; // 'Male' or 'Female'

  @Column({ type: "int", default: 0 })
  orphans: number;

  @Column({ type: "int", default: 0 })
  divorced: number;

  @Column({ type: "int", default: 0 })
  disable: number;

  @Column({ type: "int", default: 0 })
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

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;

  @Column({ type: "boolean", default: false })
  is_archived: boolean;
}
