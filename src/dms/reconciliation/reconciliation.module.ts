import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { ConfigModule } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { ReconciliationService } from "./reconciliation.service";
import { ReconciliationController } from "./reconciliation.controller";
import { Reconciliation } from "./entities/reconciliation.entity";
import { ReconciliationS3Service } from "./reconciliation-s3.service";
import { Donor } from "../donor/entities/donor.entity";
import { Donation } from "../../donations/entities/donation.entity";
import { PermissionsModule } from "../../permissions/permissions.module";

@Module({
  imports: [
    ConfigModule,
    PermissionsModule,
    TypeOrmModule.forFeature([Reconciliation, Donor, Donation]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
  ],
  controllers: [ReconciliationController],
  providers: [ReconciliationService, ReconciliationS3Service],
  exports: [ReconciliationService],
})
export class ReconciliationModule {}
