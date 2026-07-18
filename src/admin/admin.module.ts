import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { AdminController } from "./admin.controller";
import { AdminService } from "./services/admin.service";
import { ProcurementsEntity } from "../procurements/entities/procurements.entity/procurements.entity";
import { AccountsAndFinanceEntity } from "../accounts-and-finance/entities/accounts-and-finance.entity/accounts-and-finance.entity";
import { AuthModule } from "../auth/auth.module";
import { StoreDailyReportsController } from "src/store/store_daily_reports/store-daily-reports.controller";
import { StoreDailyReportsService } from "src/store/store_daily_reports/store-daily-reports.service";
import { StoreDailyReportEntity } from "src/store/store_daily_reports/entities/store-daily-report.entity";
import { StoreEntity } from "src/store/entities/store.entity";
import { User } from "src/users/user.entity";
import { UsersModule } from "src/users/users.module";
import { ProcurementsDailyReportEntity } from "src/procurements/procurements_daily_reports/entities/procurements-daily-report.entity";
import { AccountsAndFinanceDailyReportEntity } from "src/accounts-and-finance/accounts_and_finance_daily_reports/entities/accounts-and-finance-daily-report.entity";
import { ApplicationReport } from "src/program/application_reports/entities/application-report.entity";
import { AreaRationReport } from "src/program/area_ration/reports/entities/area-ration-report.entity";
import { EducationReport } from "src/program/education/reports/entities/education-report.entity";
import { FinancialAssistanceReport } from "src/program/financial_assistance/reports/entities/financial-assistance-report.entity";
import { KasbReport } from "src/program/kasb/reports/entities/kasb-report.entity";
import { KasbTrainingReport } from "src/program/kasb_training/reports/entities/kasb-training-report.entity";
import { MarriageGiftReport } from "src/program/marriage_gifts/reports/entities/marriage-gift-report.entity";
import { RationReport } from "src/program/ration/reports/entities/ration-report.entity";
import { SewingMachineReport } from "src/program/sewing_machine/reports/entities/sewing-machine-report.entity";
import { TreePlantationReport } from "src/program/tree_plantation/reports/entities/tree-plantation-report.entity";
import { WaterReport } from "src/program/water/reports/entities/water-report.entity";
import { WheelChairOrCrutchesReport } from "src/program/wheel_chair_or_crutches/reports/entities/wheel-chair-or-crutches-report.entity";
import { PermissionsModule } from "src/permissions";
import { SummaryModule } from "./summary/summary.module";
import { HrModule } from "./hr/hr.module";
import { ProjectsModule } from "./projects/projects.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      StoreDailyReportEntity,
      ProcurementsDailyReportEntity,
      AccountsAndFinanceEntity,
      StoreEntity,
      User,
      AccountsAndFinanceDailyReportEntity,
      ApplicationReport,
      AreaRationReport,
      EducationReport,
      FinancialAssistanceReport,
      KasbReport,
      KasbTrainingReport,
      MarriageGiftReport,
      RationReport,
      SewingMachineReport,
      TreePlantationReport,
      WaterReport,
      WheelChairOrCrutchesReport,
    ]),
    PermissionsModule,
    AuthModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    UsersModule,
    SummaryModule,
    HrModule,
    ProjectsModule,
  ],
  controllers: [
    AdminController,
    StoreDailyReportsController, // Register the new controller
  ],
  providers: [
    AdminService,
    StoreDailyReportsService, // Register the new service
  ],
})
export class AdminModule {}
