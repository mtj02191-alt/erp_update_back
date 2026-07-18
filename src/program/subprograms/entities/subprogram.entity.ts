import { BaseEntity } from "src/utils/base_utils/entities/baseEntity";
import { Column, Entity, Unique } from "typeorm";

@Entity("program_subprograms")
@Unique(["program_id", "key"])
export class ProgramSubprogram extends BaseEntity {
  @Column({ type: "int", name: "program_id" })
  program_id: number;

  @Column({ type: "varchar", length: 255 })
  key: string;

  @Column({ type: "varchar", length: 255 })
  label: string;

  // Used by UI dropdowns to hide inactive subprograms
  @Column({ type: "varchar", length: 20, default: "active" })
  status: string;
}
