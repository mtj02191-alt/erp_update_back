import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { KasbReportsService } from "./kasb-reports.service";
import { KasbReportsController } from "./kasb-reports.controller";
import { KasbReport } from "./entities/kasb-report.entity";
import { JwtModule } from "@nestjs/jwt";
import { User } from "../../../users/user.entity";
import { PermissionsModule } from "src/permissions";

@Module({
  imports: [
    TypeOrmModule.forFeature([KasbReport, User]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
  ],
  controllers: [KasbReportsController],
  providers: [KasbReportsService],
  exports: [KasbReportsService],
})
export class KasbReportsModule {}
