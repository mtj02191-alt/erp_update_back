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

@Entity("education_reports")
export class EducationReport {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "date", nullable: false })
  date: Date;

  // Male section
  @Column({ type: "int", default: 0 })
  male_orphans: number;

  @Column({ type: "int", default: 0 })
  male_divorced: number;

  @Column({ type: "int", default: 0 })
  male_disable: number;

  @Column({ type: "int", default: 0 })
  male_indegent: number;

  // Female section
  @Column({ type: "int", default: 0 })
  female_orphans: number;

  @Column({ type: "int", default: 0 })
  female_divorced: number;

  @Column({ type: "int", default: 0 })
  female_disable: number;

  @Column({ type: "int", default: 0 })
  female_indegent: number;

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

  @CreateDateColumn()
  created_at: Date;

  @UpdateDateColumn()
  updated_at: Date;
}
