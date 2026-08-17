import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { AppealUpdatesService } from "./appeal_updates.service";
import { AppealUpdatesController } from "./appeal_updates.controller";
import { AppealUpdate } from "./entities/appeal_update.entity";
import { PermissionsModule } from "../../permissions/permissions.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([AppealUpdate]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
  ],
  controllers: [AppealUpdatesController],
  providers: [AppealUpdatesService],
  exports: [AppealUpdatesService],
})
export class AppealUpdatesModule {}
