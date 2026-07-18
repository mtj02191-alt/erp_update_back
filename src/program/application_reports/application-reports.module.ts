import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ApplicationReportsService } from "./application-reports.service";
import { ApplicationReportsController } from "./application-reports.controller";
import { ApplicationReport } from "./entities/application-report.entity";
import { User } from "../../users/user.entity";
import { JwtModule } from "@nestjs/jwt";
import { PermissionsModule } from "src/permissions";

@Module({
  imports: [
    TypeOrmModule.forFeature([ApplicationReport, User]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
  ],
  controllers: [ApplicationReportsController],
  providers: [ApplicationReportsService],
  exports: [ApplicationReportsService],
})
export class ApplicationReportsModule {}
