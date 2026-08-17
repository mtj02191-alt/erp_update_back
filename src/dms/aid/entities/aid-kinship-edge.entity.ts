import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from "typeorm";
import { BaseEntity } from "../../../utils/base_utils/entities/baseEntity";
import { AidKinshipRelation } from "../aid.enums";
import { AidPerson } from "./aid-person.entity";

@Entity("aid_kinship_edges")
@Unique("uq_aid_kinship_edge", ["from_person_id", "to_person_id", "relation_type"])
@Index("idx_aid_kinship_from", ["from_person_id"])
@Index("idx_aid_kinship_to", ["to_person_id"])
export class AidKinshipEdge extends BaseEntity {
  @Column({ type: "int" })
  from_person_id: number;

  @ManyToOne(() => AidPerson, { onDelete: "CASCADE" })
  @JoinColumn({ name: "from_person_id" })
  from_person: AidPerson;

  @Column({ type: "int" })
  to_person_id: number;

  @ManyToOne(() => AidPerson, { onDelete: "CASCADE" })
  @JoinColumn({ name: "to_person_id" })
  to_person: AidPerson;

  @Column({
    type: "enum",
    enum: AidKinshipRelation,
    default: AidKinshipRelation.OTHER,
  })
  relation_type: AidKinshipRelation;

  @Column({ type: "text", nullable: true, default: null })
  notes: string | null;
}
