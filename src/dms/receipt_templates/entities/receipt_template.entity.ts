import { Entity, Column } from "typeorm";
import { BaseEntity } from "../../../utils/base_utils/entities/baseEntity";

@Entity("receipt_templates")
export class ReceiptTemplate extends BaseEntity {
  @Column({ unique: true })
  name: string;

  @Column({ type: "text" })
  raw_html: string;
}
