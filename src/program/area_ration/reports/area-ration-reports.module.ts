import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AreaRationReport } from "./entities/area-ration-report.entity";
import { AreaRationReportsService } from "./area-ration-reports.service";
import { AreaRationReportsController } from "./area-ration-reports.controller";
import { JwtModule } from "@nestjs/jwt";
import { User } from "../../../users/user.entity";
import { PermissionsModule } from "src/permissions";
import { MISummaryListener } from "src/program/listeners/summary.listener";

@Module({
  imports: [
    TypeOrmModule.forFeature([AreaRationReport, User]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
  ],
  providers: [AreaRationReportsService, MISummaryListener],
  controllers: [AreaRationReportsController],
})
export class AreaRationReportsModule {}
