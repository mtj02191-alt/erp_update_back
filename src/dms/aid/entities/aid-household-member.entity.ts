import { Column, Entity, Index, JoinColumn, ManyToOne, Unique } from "typeorm";
import { BaseEntity } from "../../../utils/base_utils/entities/baseEntity";
import { AidHouseholdRole } from "../aid.enums";
import { AidHousehold } from "./aid-household.entity";
import { AidPerson } from "./aid-person.entity";

@Entity("aid_household_members")
@Unique("uq_aid_household_member", ["household_id", "person_id"])
@Index("idx_aid_hh_member_person", ["person_id"])
export class AidHouseholdMember extends BaseEntity {
  @Column({ type: "int" })
  household_id: number;

  @ManyToOne(() => AidHousehold, { onDelete: "CASCADE" })
  @JoinColumn({ name: "household_id" })
  household: AidHousehold;

  @Column({ type: "int" })
  person_id: number;

  @ManyToOne(() => AidPerson, { onDelete: "CASCADE" })
  @JoinColumn({ name: "person_id" })
  person: AidPerson;

  @Column({
    type: "enum",
    enum: AidHouseholdRole,
    default: AidHouseholdRole.OTHER,
  })
  role_in_household: AidHouseholdRole;
}
