import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FinancialAssistanceReportsService } from "./financial-assistance-reports.service";
import { FinancialAssistanceReportsController } from "./financial-assistance-reports.controller";
import { FinancialAssistanceReport } from "./entities/financial-assistance-report.entity";
import { JwtModule } from "@nestjs/jwt";
import { User } from "../../../users/user.entity";
import { PermissionsModule } from "src/permissions";

@Module({
  imports: [
    TypeOrmModule.forFeature([FinancialAssistanceReport, User]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
  ],
  controllers: [FinancialAssistanceReportsController],
  providers: [FinancialAssistanceReportsService],
  exports: [FinancialAssistanceReportsService],
})
export class FinancialAssistanceReportsModule {}
