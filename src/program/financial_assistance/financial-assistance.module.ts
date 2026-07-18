import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { FinancialAssistanceReportsModule } from "./reports/financial-assistance-reports.module";
import { PermissionsModule } from "src/permissions";

@Module({
  imports: [
    TypeOrmModule.forFeature([]),
    FinancialAssistanceReportsModule,
    PermissionsModule,
  ],
  controllers: [],
  providers: [],
  exports: [FinancialAssistanceReportsModule],
})
export class FinancialAssistanceModule {}
