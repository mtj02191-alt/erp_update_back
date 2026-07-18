import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from "typeorm";

@Entity("procurements_daily_reports")
export class ProcurementsEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "date" })
  date: Date;

  @Column({ type: "int" })
  total_generated_pos: number;

  @Column({ type: "int" })
  pending_pos: number;

  @Column({ type: "int" })
  fulfilled_pos: number;

  @Column({ type: "int" })
  total_generated_pis: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  total_paid_amount: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  unpaid_amount: number;

  @Column({ type: "int" })
  unpaid_pis: number;

  @Column({ type: "int" })
  tenders: number;

  @CreateDateColumn()
  created_at: Date;
}
