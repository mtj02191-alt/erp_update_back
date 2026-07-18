import { Module, Logger } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { NotificationsService } from "./notifications.service";
import { NotificationsController } from "./notifications.controller";
import { NotificationsGateway } from "./notifications.gateway";
import { Notification } from "./entities/notification.entity";
import { UserNotification } from "./entities/user-notification.entity";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { PermissionsModule } from "../permissions/permissions.module";

const logger = new Logger("NotificationsModule");

@Module({
  imports: [
    TypeOrmModule.forFeature([Notification, UserNotification]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsGateway, // Use normal DI instead of factory to enable lifecycle hooks
  ],
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {
  private readonly logger = new Logger(NotificationsModule.name);

  constructor() {
    this.logger.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    this.logger.log("📦 NotificationsModule loaded");
    this.logger.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  }
}
