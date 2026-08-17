import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { AppealsService } from "./appeals.service";
import { AppealsController } from "./appeals.controller";
import { PublicAppealsController } from "./public-appeals.controller";
import { Appeal } from "./entities/appeal.entity";
import { AppealsBenificiary } from "../appeals_benificiaries/entities/appeals_benificiary.entity";
import { AppealUpdate } from "../appeal_updates/entities/appeal_update.entity";
import { AppealMedia } from "../appeal_media/entities/appeal_media.entity";
import { Donation } from "../../donations/entities/donation.entity";
import { PermissionsModule } from "../../permissions/permissions.module";
import { AppealsBenificiariesModule } from "../appeals_benificiaries/appeals_benificiaries.module";
import { AppealMediaModule } from "../appeal_media/appeal_media.module";
import { User } from "../../users/user.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Appeal,
      AppealsBenificiary,
      AppealUpdate,
      AppealMedia,
      Donation,
      User,
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
    AppealsBenificiariesModule,
    AppealMediaModule,
  ],
  controllers: [AppealsController, PublicAppealsController],
  providers: [AppealsService],
  exports: [AppealsService, TypeOrmModule],
})
export class AppealsModule {}
