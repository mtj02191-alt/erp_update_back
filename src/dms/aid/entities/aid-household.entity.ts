import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../utils/base_utils/entities/baseEntity";
import { AidPerson } from "./aid-person.entity";

@Entity("aid_households")
export class AidHousehold extends BaseEntity {
  @Column({ type: "varchar", length: 40, nullable: true, default: null })
  code: string | null;

  @Column({ type: "varchar", length: 200, nullable: true, default: null })
  label: string | null;

  @Column({ type: "text", nullable: true, default: null })
  address: string | null;

  @Column({ type: "int", nullable: true, default: null })
  head_person_id: number | null;

  @ManyToOne(() => AidPerson, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "head_person_id" })
  head_person: AidPerson | null;

  @Column({ type: "text", nullable: true, default: null })
  notes: string | null;
}
