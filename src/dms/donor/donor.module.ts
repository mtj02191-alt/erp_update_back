import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { DonorService } from "./donor.service";
import { DonorController } from "./donor.controller";
import { Donor } from "./entities/donor.entity";
import { Donation } from "../../donations/entities/donation.entity";
import { PermissionsModule } from "../../permissions/permissions.module";
import { User } from "src/users/user.entity";
import { UsersModule } from "src/users/users.module";
import { DashboardModule } from "../../dashboard/dashboard.module";
import { DonorPasswordBackfillService } from "./donor-password-backfill.service";
import { DonorPasswordBackfillRunner } from "./donor-password-backfill.runner";
import { DonorGeoBackfillService } from "./donor-geo-backfill.service";
import { DonorGeoBackfillRunner } from "./donor-geo-backfill.runner";
import { DonorAuditModule } from "./audit/donor-audit.module";
import { DonorPipelineStageHistory } from "./pipeline/entities/donor-pipeline-stage-history.entity";
import { OrganizationsModule } from "../organizations/organizations.module";

@Module({
  imports: [
    DonorAuditModule,
    OrganizationsModule,
    TypeOrmModule.forFeature([Donor, User, Donation, DonorPipelineStageHistory]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
    UsersModule,
    DashboardModule,
  ],
  controllers: [DonorController],
  providers: [
    DonorService,
    DonorPasswordBackfillService,
    DonorPasswordBackfillRunner,
    DonorGeoBackfillService,
    DonorGeoBackfillRunner,
  ],
  exports: [DonorService, TypeOrmModule], // Export TypeOrmModule for Donor repository
})
export class DonorModule {}
