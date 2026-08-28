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
import { EmailModule } from "../../email/email.module";
import { ConfigModule } from "@nestjs/config";
import { DonorFollowupCronService } from "./donor-followup-cron.service";

@Module({
  imports: [
    PermissionsModule,
    EmailModule,
    ConfigModule,
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
  providers: [DonorRelationshipService, DonorFollowupCronService],
  exports: [DonorRelationshipService, DonorFollowupCronService],
})
export class DonorRelationshipModule {}
