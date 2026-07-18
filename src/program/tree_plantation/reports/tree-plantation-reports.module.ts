import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TreePlantationReport } from "./entities/tree-plantation-report.entity";
import { TreePlantationReportsService } from "./tree-plantation-reports.service";
import { TreePlantationReportsController } from "./tree-plantation-reports.controller";
import { JwtModule } from "@nestjs/jwt";
import { User } from "../../../users/user.entity";
import { PermissionsModule } from "src/permissions";

@Module({
  imports: [
    TypeOrmModule.forFeature([TreePlantationReport, User]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
  ],
  providers: [TreePlantationReportsService],
  controllers: [TreePlantationReportsController],
})
export class TreePlantationReportsModule {}
