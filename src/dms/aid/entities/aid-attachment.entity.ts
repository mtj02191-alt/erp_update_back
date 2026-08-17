import { Column, Entity, Index, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../utils/base_utils/entities/baseEntity";
import { User } from "../../../users/user.entity";
import { AidAttachmentContext } from "../aid.enums";
import { AidApplication } from "./aid-application.entity";
import { AidPerson } from "./aid-person.entity";

@Entity("aid_attachments")
@Index("idx_aid_attach_app", ["application_id"])
@Index("idx_aid_attach_person", ["person_id"])
export class AidAttachment extends BaseEntity {
  @Column({ type: "int", nullable: true, default: null })
  application_id: number | null;

  @ManyToOne(() => AidApplication, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "application_id" })
  application: AidApplication | null;

  @Column({ type: "int", nullable: true, default: null })
  person_id: number | null;

  @ManyToOne(() => AidPerson, { nullable: true, onDelete: "CASCADE" })
  @JoinColumn({ name: "person_id" })
  person: AidPerson | null;

  @Column({
    type: "enum",
    enum: AidAttachmentContext,
    default: AidAttachmentContext.PROFILE,
  })
  context: AidAttachmentContext;

  @Column({ type: "varchar" })
  file_name: string;

  @Column({ type: "varchar" })
  file_url: string;

  @Column({ type: "varchar", nullable: true, default: null })
  file_type: string | null;

  @Column({ type: "text", nullable: true, default: null })
  description: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "uploaded_by" })
  uploaded_by: User | null;
}
