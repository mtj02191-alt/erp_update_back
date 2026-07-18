import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { SewingMachineReportsService } from "./sewing-machine-reports.service";
import { SewingMachineReportsController } from "./sewing-machine-reports.controller";
import { SewingMachineReport } from "./entities/sewing-machine-report.entity";
import { JwtModule } from "@nestjs/jwt";
import { User } from "../../../users/user.entity";
import { PermissionsModule } from "src/permissions";

@Module({
  imports: [
    TypeOrmModule.forFeature([SewingMachineReport, User]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
  ],
  controllers: [SewingMachineReportsController],
  providers: [SewingMachineReportsService],
  exports: [SewingMachineReportsService],
})
export class SewingMachineModule {}
