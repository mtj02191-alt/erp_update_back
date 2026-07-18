import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { CampaignsService } from "./campaigns.service";
import { CampaignsController } from "./campaigns.controller";
import { PublicCampaignsController } from "./public-campaigns.controller";
import { Campaign } from "./entities/campaign.entity";
import { Donation } from "../../donations/entities/donation.entity";
import { PermissionsModule } from "../../permissions/permissions.module";
import { User } from "../../users/user.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([Campaign, Donation, User]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
  ],
  controllers: [CampaignsController, PublicCampaignsController],
  providers: [CampaignsService],
  exports: [CampaignsService, TypeOrmModule],
})
export class CampaignsModule {}
