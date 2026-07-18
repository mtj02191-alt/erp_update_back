import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ProcurementsDailyReportsController } from "./procurements-daily-reports.controller";
import { ProcurementsDailyReportsService } from "./procurements-daily-reports.service";
import { ProcurementsDailyReportEntity } from "./entities/procurements-daily-report.entity";
import { JwtModule } from "@nestjs/jwt";
import { User } from "../../users/user.entity";
import { PermissionsModule } from "src/permissions";

@Module({
  imports: [
    TypeOrmModule.forFeature([ProcurementsDailyReportEntity, User]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
  ],
  controllers: [ProcurementsDailyReportsController],
  providers: [ProcurementsDailyReportsService],
  exports: [ProcurementsDailyReportsService],
})
export class ProcurementsDailyReportsModule {}
