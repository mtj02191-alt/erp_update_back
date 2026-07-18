import { BaseEntity } from "../../../../../utils/base_utils/entities/baseEntity";
import { Entity, PrimaryGeneratedColumn, Column } from "typeorm";

@Entity("mis_programs_summary")
export class ProgramEntity extends BaseEntity {
  @Column({ type: "varchar", length: 255, nullable: true })
  program_name: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  program_type: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  program_code: string;

  @Column({ type: "varchar", length: 255, nullable: true })
  beneficiary_type: string;

  @Column({ type: "int", default: 0, nullable: true })
  quantity: number;

  @Column({
    type: "decimal",
    precision: 10,
    scale: 2,
    default: 0,
    nullable: true,
  })
  amount: number;
}
