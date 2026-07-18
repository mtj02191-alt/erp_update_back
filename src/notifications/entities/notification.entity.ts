import { BaseEntity } from "src/utils/base_utils/entities/baseEntity";
import { Entity, Column, OneToMany, Index } from "typeorm";
import { UserNotification } from "./user-notification.entity";

export enum NotificationType {
  INFO = "info",
  SUCCESS = "success",
  WARNING = "warning",
  ERROR = "error",
  DONATION = "donation",
  SYSTEM = "system",
}

@Entity("notifications")
@Index("idx_notifications_type", ["type"])
@Index("idx_notifications_created", ["created_at"])
export class Notification extends BaseEntity {
  @Column({ type: "varchar", length: 255, nullable: false })
  title: string;

  @Column({ type: "text", nullable: false })
  message: string;

  @Column({
    type: "enum",
    enum: NotificationType,
    default: NotificationType.INFO,
    nullable: false,
  })
  type: NotificationType;

  @Column({ type: "varchar", length: 500, nullable: true })
  link: string;

  @Column({ type: "json", nullable: true })
  metadata: Record<string, any>;

  // Relation to user notifications (many-to-many through junction table)
  @OneToMany(
    () => UserNotification,
    (userNotification) => userNotification.notification,
  )
  userNotifications: UserNotification[];
}
