import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
} from "typeorm";

@Entity("accounts_and_finance")
export class AccountsAndFinanceEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ type: "date" })
  date: Date;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  daily_inflow: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  daily_outflow: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  pending_payable: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  petty_cash: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  available_funds: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  tax_late_payments: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  payable_reports: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  restricted_funds_reports: number;

  @Column({ type: "decimal", precision: 10, scale: 2 })
  payment_commitment_party_vise: number;

  @CreateDateColumn()
  created_at: Date;
}
