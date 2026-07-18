import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RationReportsService } from "./ration-reports.service";
import { RationReportsController } from "./ration-reports.controller";
import { RationReport } from "./entities/ration-report.entity";
import { JwtModule } from "@nestjs/jwt";
import { User } from "../../../users/user.entity";
import { PermissionsModule } from "src/permissions";

@Module({
  imports: [
    TypeOrmModule.forFeature([RationReport, User]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
  ],
  controllers: [RationReportsController],
  providers: [RationReportsService],
  exports: [RationReportsService],
})
export class RationReportsModule {}
