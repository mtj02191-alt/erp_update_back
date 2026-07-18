import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { NewDashboardService } from "./new_dashboard.service";
import { NewDashboardController } from "./new_dashboard.controller";
import { ProgramEntity } from "../program/programs/entities/program.entity";
import { ApplicationReport } from "../program/application_reports/entities/application-report.entity";
import { RationReport } from "../program/ration/reports/entities/ration-report.entity";
import { EducationReport } from "../program/education/reports/entities/education-report.entity";
import { FinancialAssistanceReport } from "../program/financial_assistance/reports/entities/financial-assistance-report.entity";
import { MarriageGiftReport } from "../program/marriage_gifts/reports/entities/marriage-gift-report.entity";
import { KasbReport } from "../program/kasb/reports/entities/kasb-report.entity";
import { KasbTrainingReport } from "../program/kasb_training/reports/entities/kasb-training-report.entity";
import { SewingMachineReport } from "../program/sewing_machine/reports/entities/sewing-machine-report.entity";
import { TreePlantationReport } from "../program/tree_plantation/reports/entities/tree-plantation-report.entity";
import { WaterReport } from "../program/water/reports/entities/water-report.entity";
import { WheelChairOrCrutchesReport } from "../program/wheel_chair_or_crutches/reports/entities/wheel-chair-or-crutches-report.entity";
import { StoreDailyReportEntity } from "../store/store_daily_reports/entities/store-daily-report.entity";
import { ProcurementsDailyReportEntity } from "../procurements/procurements_daily_reports/entities/procurements-daily-report.entity";
import { AccountsAndFinanceDailyReportEntity } from "../accounts-and-finance/accounts_and_finance_daily_reports/entities/accounts-and-finance-daily-report.entity";
import { AlHasanainClg } from "../program/al_hasanain_clg/entities/al_hasanain_clg.entity";
import { AasCollectionCentersReport } from "../program/aas_collection_centers_report/entities/aas_collection_centers_report.entity";
import { DreamSchoolReport } from "../program/dream_school_reports/entities/dream_school_report.entity";
import { HealthReport } from "../program/health/entities/health.entity";
import { PermissionsModule } from "src/permissions";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      ProgramEntity,
      ApplicationReport,
      RationReport,
      EducationReport,
      FinancialAssistanceReport,
      MarriageGiftReport,
      KasbReport,
      KasbTrainingReport,
      SewingMachineReport,
      TreePlantationReport,
      WaterReport,
      WheelChairOrCrutchesReport,
      StoreDailyReportEntity,
      ProcurementsDailyReportEntity,
      AccountsAndFinanceDailyReportEntity,
      AlHasanainClg,
      AasCollectionCentersReport,
      DreamSchoolReport,
      HealthReport,
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
  ],
  controllers: [NewDashboardController],
  providers: [NewDashboardService],
  exports: [NewDashboardService],
})
export class NewDashboardModule {}
