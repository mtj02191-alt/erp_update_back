import { BaseEntity } from "src/utils/base_utils/entities/baseEntity";
import { Column, Entity } from "typeorm";

@Entity("mis_summary")
export class Summary extends BaseEntity {
  @Column({ type: "varchar", length: 255, nullable: true })
  program_id: number;

  @Column({ type: "int", nullable: true })
  total_spent: number;

  @Column({ type: "int", nullable: true })
  total_received: number;

  @Column({ type: "int", nullable: true })
  total_balance: number;
}
