import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { AasCollectionCentersReport } from "./entities/aas_collection_centers_report.entity";
import { AasCollectionCentersReportService } from "./aas_collection_centers_report.service";
import { AasCollectionCentersReportController } from "./aas_collection_centers_report.controller";
import { PermissionsModule } from "src/permissions";

@Module({
  imports: [
    TypeOrmModule.forFeature([AasCollectionCentersReport]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
  ],
  controllers: [AasCollectionCentersReportController],
  providers: [AasCollectionCentersReportService],
  exports: [AasCollectionCentersReportService, TypeOrmModule],
})
export class AasCollectionCentersReportModule {}
