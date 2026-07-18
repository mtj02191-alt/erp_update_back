import { BaseEntity } from "src/utils/base_utils/entities/baseEntity";
import { Column, Entity } from "typeorm";

@Entity("program_targets")
export class Target extends BaseEntity {
  @Column({ type: "varchar", nullable: true })
  year: string;

  @Column({ type: "varchar", nullable: true })
  program: string;

  @Column({ type: "int", default: 0, nullable: true })
  target: number;

  @Column({ type: "int", default: 0, nullable: true })
  reached: number;

  @Column({ type: "varchar", nullable: true })
  target_type: string;
}
