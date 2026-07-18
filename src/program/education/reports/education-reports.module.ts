import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { EducationReportsService } from "./education-reports.service";
import { EducationReportsController } from "./education-reports.controller";
import { EducationReport } from "./entities/education-report.entity";
import { JwtModule } from "@nestjs/jwt";
import { User } from "../../../users/user.entity";
import { PermissionsModule } from "src/permissions";

@Module({
  imports: [
    TypeOrmModule.forFeature([EducationReport, User]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
  ],
  controllers: [EducationReportsController],
  providers: [EducationReportsService],
})
export class EducationReportsModule {}
