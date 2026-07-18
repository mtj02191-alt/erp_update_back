import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { AccountsAndFinanceDailyReportsController } from "./accounts-and-finance-daily-reports.controller";
import { AccountsAndFinanceDailyReportsService } from "./accounts-and-finance-daily-reports.service";
import { AccountsAndFinanceDailyReportEntity } from "./entities/accounts-and-finance-daily-report.entity";
import { PermissionsModule } from "src/permissions/permissions.module";
import { JwtModule } from "@nestjs/jwt";

@Module({
  imports: [
    TypeOrmModule.forFeature([AccountsAndFinanceDailyReportEntity]),
    PermissionsModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: "1h" },
    }),
  ],
  controllers: [AccountsAndFinanceDailyReportsController],
  providers: [AccountsAndFinanceDailyReportsService],
  exports: [AccountsAndFinanceDailyReportsService],
})
export class AccountsAndFinanceDailyReportsModule {}
