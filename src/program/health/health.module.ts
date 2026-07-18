import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { HealthService } from "./health.service";
import { HealthController } from "./health.controller";
import { HealthReport } from "./entities/health.entity";
import { User } from "../../users/user.entity";
import { PermissionsModule } from "src/permissions";

@Module({
  imports: [
    TypeOrmModule.forFeature([HealthReport, User]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
  ],
  controllers: [HealthController],
  providers: [HealthService],
})
export class HealthModule {}
