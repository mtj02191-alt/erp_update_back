import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from "typeorm";
import { User } from "../../../users/user.entity";
import { Donor } from "../../donor/entities/donor.entity";

@Entity("user_donors")
@Index(["user_id", "donor_id"], { unique: true })
export class UserDonor {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  user_id: number;

  @Column()
  donor_id: number;

  @Column({
    type: "varchar",
    length: 20,
    default: "active",
    comment: "Assignment status: active, inactive, transferred",
  })
  status: string;

  @Column({
    type: "text",
    nullable: true,
    comment: "Additional notes about the assignment",
  })
  notes: string;

  @Column({
    nullable: true,
    comment: "ID of the user who made this assignment",
  })
  assigned_by: number;

  @Column({
    nullable: true,
    comment: "ID of the user who referred this assignment",
  })
  referrer_id: number;

  @CreateDateColumn({
    name: "assigned_at",
    comment: "When the donor was assigned to the user",
  })
  assigned_at: Date;

  @UpdateDateColumn({
    name: "updated_at",
    comment: "Last time this assignment was updated",
  })
  updated_at: Date;

  // Relationships
  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Donor, { onDelete: "CASCADE" })
  @JoinColumn({ name: "donor_id" })
  donor: Donor;

  @ManyToOne(() => User, { onDelete: "SET NULL" })
  @JoinColumn({ name: "assigned_by" })
  assignedByUser: User;

  @ManyToOne(() => User, { onDelete: "SET NULL" })
  @JoinColumn({ name: "referrer_id" })
  referrer: User;
}
