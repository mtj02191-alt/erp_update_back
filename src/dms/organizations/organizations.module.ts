import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { OrganizationsService } from "./organizations.service";
import { OrganizationsController } from "./organizations.controller";
import { Organization } from "./entities/organization.entity";
import { OrganizationBranch } from "./entities/organization-branch.entity";
import { DonorOrganizationAffiliation } from "./entities/donor-organization-affiliation.entity";
import { Donor } from "../donor/entities/donor.entity";
import { PermissionsModule } from "../../permissions/permissions.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Organization,
      OrganizationBranch,
      DonorOrganizationAffiliation,
      Donor,
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
  ],
  controllers: [OrganizationsController],
  providers: [OrganizationsService],
  exports: [OrganizationsService, TypeOrmModule],
})
export class OrganizationsModule {}
