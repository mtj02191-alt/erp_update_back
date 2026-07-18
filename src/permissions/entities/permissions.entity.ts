import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  OneToOne,
  JoinColumn,
} from "typeorm";
import { User } from "../../users/user.entity";

@Entity("user_permissions")
export class PermissionsEntity {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ name: "user_id" })
  user_id: number;

  @Column({
    type: "jsonb",
    name: "permissions",
    nullable: false,
    default: "{}",
  })
  permissions: Record<string, any>;

  @OneToOne(() => User, (user) => user.permissions, {
    nullable: false,
    onDelete: "CASCADE",
  })
  @JoinColumn({ name: "user_id" })
  user: User;

  @CreateDateColumn({
    name: "created_at",
    type: "timestamp",
    precision: 6,
    default: () => "CURRENT_TIMESTAMP",
  })
  created_at: Date;

  @UpdateDateColumn({
    name: "updated_at",
    type: "timestamp",
    precision: 6,
    default: () => "CURRENT_TIMESTAMP",
  })
  updated_at: Date;
}
