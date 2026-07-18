import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";
import { User } from "../../users/user.entity";

export enum ColumnType {
  DEFAULT = "default",
  CUSTOM = "custom",
}

@Entity("kanban_columns")
export class KanbanColumn {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({ type: "varchar", length: 255 })
  name: string;

  @Column({ type: "varchar", length: 50, unique: true })
  status: string;

  @Column({
    type: "enum",
    enum: ColumnType,
    default: ColumnType.CUSTOM,
  })
  type: ColumnType;

  @Column({ type: "int", default: 0 })
  order: number;

  @Column({ type: "varchar", length: 50, nullable: true })
  color: string;

  @Column({ type: "int", nullable: true, name: "created_by_id" })
  createdById: number;

  @ManyToOne(() => User, { nullable: true, eager: false, onDelete: "SET NULL" })
  @JoinColumn({ name: "created_by_id" })
  createdBy: User;

  @CreateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  createdAt: Date;

  @UpdateDateColumn({ type: "timestamp", default: () => "CURRENT_TIMESTAMP" })
  updatedAt: Date;
}
