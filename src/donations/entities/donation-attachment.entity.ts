import { Entity, Column, ManyToOne, JoinColumn } from "typeorm";
import { BaseEntity } from "../../utils/base_utils/entities/baseEntity";
import { Donation } from "./donation.entity";
import { User } from "../../users/user.entity";

@Entity("donation_attachments")
export class DonationAttachment extends BaseEntity {
  @ManyToOne(() => Donation, (donation) => donation.attachments, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "donation_id" })
  donation: Donation;

  @Column({ type: "varchar" })
  file_name: string;

  @Column({ type: "varchar" })
  file_url: string;

  @Column({ type: "varchar", nullable: true })
  file_type: string;

  /** Display name for the attachment (same role as task attachment description). */
  @Column({ type: "text", nullable: true })
  description: string;

  @ManyToOne(() => User, (user) => user.id, {
    nullable: true,
    onDelete: "SET NULL",
  })
  @JoinColumn({ name: "uploaded_by" })
  uploaded_by: User;
}
