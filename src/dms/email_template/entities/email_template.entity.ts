import { Entity, Column } from "typeorm";
import { BaseEntity } from "../../../utils/base_utils/entities/baseEntity";

@Entity("email_templates")
export class EmailTemplate extends BaseEntity {
  @Column({ unique: true })
  name: string;

  @Column()
  subject: string;

  @Column({ type: "text" })
  body: string;

  @Column({ type: "text", nullable: true })
  description: string;

  @Column({ default: "general" })
  category: string;

  @Column({ default: true })
  is_active: boolean;
}
