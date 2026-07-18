import { BaseEntity } from "src/utils/base_utils/entities/baseEntity";
import { Column, Entity, Unique } from "typeorm";

@Entity("programs")
@Unique(["key"])
export class ProgramEntity extends BaseEntity {
  @Column({ type: "varchar", length: 255, nullable: false })
  key: string;

  @Column({ type: "varchar", length: 255, nullable: false })
  label: string;

  @Column({ type: "text", nullable: true })
  logo: string;

  @Column({ type: "varchar", length: 20, default: "active" })
  status: string;

  /** When false, program is excluded from application reports UI and Program Overview (Applications). */
  @Column({ type: "boolean", name: "applicationable", default: true })
  applicationable: boolean;
}
