import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { AppealMediaService } from "./appeal_media.service";
import { AppealMediaController } from "./appeal_media.controller";
import { AppealMedia } from "./entities/appeal_media.entity";
import { PermissionsModule } from "../../permissions/permissions.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([AppealMedia]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
  ],
  controllers: [AppealMediaController],
  providers: [AppealMediaService],
  exports: [AppealMediaService],
})
export class AppealMediaModule {}
