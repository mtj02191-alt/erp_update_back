import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WheelChairOrCrutchesReportsService } from "./wheel-chair-or-crutches-reports.service";
import { WheelChairOrCrutchesReportsController } from "./wheel-chair-or-crutches-reports.controller";
import { WheelChairOrCrutchesReport } from "./entities/wheel-chair-or-crutches-report.entity";
import { JwtModule } from "@nestjs/jwt";
import { User } from "../../../users/user.entity";
import { PermissionsModule } from "src/permissions";

@Module({
  imports: [
    TypeOrmModule.forFeature([WheelChairOrCrutchesReport, User]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
  ],
  controllers: [WheelChairOrCrutchesReportsController],
  providers: [WheelChairOrCrutchesReportsService],
  exports: [WheelChairOrCrutchesReportsService],
})
export class WheelChairOrCrutchesModule {}
