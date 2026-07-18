import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
// import { AccountsAndFinanceController } from './accounts-and-finance.controller';
// import { AccountsAndFinanceService } from './services/accounts-and-finance.service';
import { AccountsAndFinanceEntity } from "./entities/accounts-and-finance.entity/accounts-and-finance.entity";
import { AccountsAndFinanceDailyReportsModule } from "./accounts_and_finance_daily_reports/accounts-and-finance-daily-reports.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([AccountsAndFinanceEntity]),
    AccountsAndFinanceDailyReportsModule,
  ],
  // controllers: [AccountsAndFinanceController],
  // providers: [AccountsAndFinanceService]
})
export class AccountsAndFinanceModule {}
