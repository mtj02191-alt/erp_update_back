import { Column, Entity } from "typeorm";
import { BaseEntity } from "../../../utils/base_utils/entities/baseEntity";

@Entity("appeals_beneficiaries")
export class AppealsBenificiary extends BaseEntity {
  @Column({ type: "varchar", length: 200 })
  name: string;

  @Column({ type: "int", nullable: true })
  age: number | null;

  @Column({ type: "varchar", length: 200, nullable: true })
  location: string | null;

  @Column({ type: "text", nullable: true })
  bio: string | null;

  @Column({ type: "text", nullable: true })
  profile_image_url: string | null;
}
