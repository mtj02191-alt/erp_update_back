import { Column, Entity, JoinColumn, ManyToOne } from "typeorm";
import { BaseEntity } from "../../../utils/base_utils/entities/baseEntity";
import { Donor } from "../../donor/entities/donor.entity";
import { User } from "../../../users/user.entity";
import { DonorInteraction } from "./donor-interaction.entity";

@Entity("donor_followups")
export class DonorFollowup extends BaseEntity {
  @ManyToOne(() => Donor, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "donor_id" })
  donor: Donor;

  @Column()
  donor_id: number;

  @ManyToOne(() => DonorInteraction, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "interaction_id" })
  interaction: DonorInteraction | null;

  @Column({ type: "int", nullable: true })
  interaction_id: number | null;

  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "assigned_to_user_id" })
  assigned_to: User;

  @Column()
  assigned_to_user_id: number;

  @Column({ type: "varchar", length: 255 })
  followup_title: string;

  @Column({ type: "text", nullable: true })
  followup_reason: string | null;

  @Column({ type: "timestamp" })
  due_datetime: Date;

  @Column({ type: "varchar", length: 32, default: "pending" })
  status: string;

  @Column({ type: "timestamp", nullable: true })
  completed_at: Date | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "completed_by_user_id" })
  completed_by: User | null;

  @Column({ type: "int", nullable: true })
  completed_by_user_id: number | null;
}
