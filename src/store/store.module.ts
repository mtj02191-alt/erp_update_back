import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
// import { StoreController } from './store.controller';
// import { StoreService } from './services/store.service';
import { JwtModule } from "@nestjs/jwt";
import { StoreDailyReportsModule } from "./store_daily_reports/store-daily-reports.module";
import { StoreDailyReportEntity } from "./store_daily_reports/entities/store-daily-report.entity";
import { User } from "../users/user.entity";
import { UsersModule } from "../users/users.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([StoreDailyReportEntity]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    StoreDailyReportsModule,
    UsersModule,
  ],
})
export class StoreModule {}
