import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { KasbTrainingReportsService } from "./kasb-training-reports.service";
import { KasbTrainingReportsController } from "./kasb-training-reports.controller";
import { KasbTrainingReport } from "./entities/kasb-training-report.entity";
import { JwtModule } from "@nestjs/jwt";
import { User } from "../../../users/user.entity";
import { PermissionsModule } from "src/permissions";

@Module({
  imports: [
    TypeOrmModule.forFeature([KasbTrainingReport, User]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
  ],
  controllers: [KasbTrainingReportsController],
  providers: [KasbTrainingReportsService],
  exports: [KasbTrainingReportsService],
})
export class KasbTrainingReportsModule {}
