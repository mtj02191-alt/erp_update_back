import { User } from "../../../../users/user.entity";
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
} from "typeorm";

@Entity("area_ration_reports")
export class AreaRationReport {
  @PrimaryGeneratedColumn("increment")
  id: number;

  @Column({ type: "date", name: "report_date" })
  report_date: Date;

  @Column({ type: "varchar", name: "province", length: 255 })
  province: string;

  @Column({ type: "varchar", name: "district", length: 255 })
  district: string;

  @Column({ type: "varchar", name: "city", length: 255 })
  city: string;

  @Column({ type: "int", name: "quantity", default: 0 })
  quantity: number;

  @Column({ type: "boolean", default: false })
  is_archived: boolean;

  @ManyToOne(() => User, (user) => user.id, {
    nullable: true,
    eager: false,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "created_by" })
  created_by: User;

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
