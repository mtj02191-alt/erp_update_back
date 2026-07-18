import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PermissionsModule } from "src/permissions/permissions.module";
import { ProgressNotificationLog } from "./progress_notification_log.entity";
import { ProgressNotificationsService } from "./progress-notifications.service";
import { ProgressNotificationsController } from "./progress-notifications.controller";

@Module({
  imports: [
    TypeOrmModule.forFeature([ProgressNotificationLog]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
  ],
  providers: [ProgressNotificationsService],
  controllers: [ProgressNotificationsController],
  exports: [ProgressNotificationsService],
})
export class ProgressNotificationsModule {}
