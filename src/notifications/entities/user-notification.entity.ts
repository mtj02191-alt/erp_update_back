import { BaseEntity } from "src/utils/base_utils/entities/baseEntity";
import { Entity, Column, ManyToOne, JoinColumn, Index, Unique } from "typeorm";
import { User } from "../../users/user.entity";
import { Notification } from "./notification.entity";

@Entity("user_notifications")
@Unique(["user_id", "notification_id"])
@Index("idx_user_notifications_user", ["user_id"])
@Index("idx_user_notifications_notification", ["notification_id"])
@Index("idx_user_notifications_read", ["is_read"])
export class UserNotification extends BaseEntity {
  @Column({ nullable: false })
  user_id: number;

  @Column({ nullable: false })
  notification_id: number;

  @Column({ type: "boolean", default: false, nullable: false })
  is_read: boolean;

  @Column({ type: "timestamp", nullable: true })
  read_at: Date;

  // Relations
  @ManyToOne(() => User, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user: User;

  @ManyToOne(() => Notification, { nullable: false, onDelete: "CASCADE" })
  @JoinColumn({ name: "notification_id" })
  notification: Notification;
}
