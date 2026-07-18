import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { Donation } from "../../donations/entities/donation.entity";
import { DonationsReportService } from "./donations-report.service";
import { DonationsReportCronService } from "./donations-report-cron.service";
import { DonationsReportController } from "./donations-report.controller";
import { EmailModule } from "../../email/email.module";
import { JwtModule } from "@nestjs/jwt";
import { PermissionsModule } from "src/permissions";

@Module({
  imports: [
    TypeOrmModule.forFeature([Donation]),
    ConfigModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    EmailModule,
    PermissionsModule,
  ],
  providers: [DonationsReportService, DonationsReportCronService],
  controllers: [DonationsReportController],
  exports: [DonationsReportService], // Export service for use in other modules
})
export class DonationsReportModule {}
