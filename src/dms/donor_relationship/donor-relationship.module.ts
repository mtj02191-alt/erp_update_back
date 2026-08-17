import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { DonorRelationshipController } from "./donor-relationship.controller";
import { DonorRelationshipService } from "./donor-relationship.service";
import { DonorInteraction } from "./entities/donor-interaction.entity";
import { DonorFollowup } from "./entities/donor-followup.entity";
import { Donor } from "../donor/entities/donor.entity";
import { User } from "../../users/user.entity";
import { PermissionsModule } from "../../permissions/permissions.module";

@Module({
  imports: [
    PermissionsModule,
    TypeOrmModule.forFeature([
      DonorInteraction,
      DonorFollowup,
      Donor,
      User,
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
  ],
  controllers: [DonorRelationshipController],
  providers: [DonorRelationshipService],
  exports: [DonorRelationshipService],
})
export class DonorRelationshipModule {}
