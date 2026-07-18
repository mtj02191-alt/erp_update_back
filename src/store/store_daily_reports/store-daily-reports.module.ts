import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { StoreDailyReportsService } from "./store-daily-reports.service";
import { StoreDailyReportsController } from "./store-daily-reports.controller";
import { StoreDailyReportEntity } from "./entities/store-daily-report.entity";
import { JwtModule } from "@nestjs/jwt";
import { User } from "../../users/user.entity";
import { UsersModule } from "../../users/users.module";
import { PermissionsModule } from "src/permissions";

@Module({
  imports: [
    TypeOrmModule.forFeature([StoreDailyReportEntity, User]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    UsersModule,
    PermissionsModule,
  ],

  controllers: [StoreDailyReportsController],
  providers: [StoreDailyReportsService],
  exports: [StoreDailyReportsService],
})
export class StoreDailyReportsModule {}
