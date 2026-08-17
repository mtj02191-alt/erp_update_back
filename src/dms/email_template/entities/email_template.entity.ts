import { Entity, Column } from "typeorm";
import { BaseEntity } from "../../../utils/base_utils/entities/baseEntity";

@Entity("email_templates")
export class EmailTemplate extends BaseEntity {
  @Column({ unique: true })
  name: string;

  @Column({ nullable: true })
  subject: string | null;

  @Column({ type: "text" })
  body: string;

  @Column({ type: "text", nullable: true })
  description: string | null;

  /** @deprecated use purposes[] */
  @Column({ default: "general" })
  category: string;

  @Column({ default: true })
  is_active: boolean;

  /** email | sms | whatsapp */
  @Column("simple-array", { nullable: true })
  channels: string[] | null;

  /** campaign | appeal | event | general */
  @Column("simple-array", { nullable: true })
  purposes: string[] | null;

  @Column("simple-array", { nullable: true })
  campaign_ids: string[] | null;

  @Column("simple-array", { nullable: true })
  appeal_ids: string[] | null;

  @Column("simple-array", { nullable: true })
  event_ids: string[] | null;

  @Column({ type: "varchar", length: 120, nullable: true })
  cta_button_text: string | null;

  @Column({ type: "text", nullable: true })
  cta_url: string | null;

  /** Selected template variables e.g. donor_name, campaign_url */
  @Column("simple-array", { nullable: true })
  variables: string[] | null;

  /** draft | active | archived */
  @Column({ type: "varchar", length: 20, default: "draft" })
  status: string;
}
