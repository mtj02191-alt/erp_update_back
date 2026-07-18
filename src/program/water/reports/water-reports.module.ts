import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { WaterReportsService } from "./water-reports.service";
import { WaterReportsController } from "./water-reports.controller";
import { WaterReport } from "./entities/water-report.entity";
import { JwtModule } from "@nestjs/jwt";
import { User } from "../../../users/user.entity";
import { PermissionsModule } from "src/permissions";

@Module({
  imports: [
    TypeOrmModule.forFeature([WaterReport, User]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
  ],
  controllers: [WaterReportsController],
  providers: [WaterReportsService],
  exports: [WaterReportsService],
})
export class WaterReportsModule {}
