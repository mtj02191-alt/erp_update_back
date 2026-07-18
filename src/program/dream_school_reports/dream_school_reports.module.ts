import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { DreamSchoolReport } from "./entities/dream_school_report.entity";
import { DreamSchool } from "../dream_schools/entities/dream_school.entity";
import { DreamSchoolReportsService } from "./dream_school_reports.service";
import { DreamSchoolReportsController } from "./dream_school_reports.controller";
import { PermissionsModule } from "src/permissions";

@Module({
  imports: [
    TypeOrmModule.forFeature([DreamSchoolReport, DreamSchool]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
  ],
  controllers: [DreamSchoolReportsController],
  providers: [DreamSchoolReportsService],
  exports: [DreamSchoolReportsService],
})
export class DreamSchoolReportsModule {}
