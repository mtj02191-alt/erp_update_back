import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MarriageGiftReportsService } from "./marriage-gift-reports.service";
import { MarriageGiftReportsController } from "./marriage-gift-reports.controller";
import { MarriageGiftReport } from "./entities/marriage-gift-report.entity";
import { JwtModule } from "@nestjs/jwt";
import { User } from "../../../users/user.entity";
import { PermissionsModule } from "src/permissions";

@Module({
  imports: [
    TypeOrmModule.forFeature([MarriageGiftReport, User]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
  ],
  controllers: [MarriageGiftReportsController],
  providers: [MarriageGiftReportsService],
  exports: [MarriageGiftReportsService],
})
export class MarriageGiftReportsModule {}
