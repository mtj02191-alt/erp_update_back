import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PermissionsModule } from "../../permissions/permissions.module";
import { S3StorageModule } from "../../utils/storage/s3-storage.module";
import { AidApplicationsController } from "./aid-applications.controller";
import { AidApplicationsService } from "./aid-applications.service";
import { AidHouseholdsController } from "./aid-households.controller";
import { AidHouseholdsService } from "./aid-households.service";
import { AidPeopleController } from "./aid-people.controller";
import { AidPeopleService } from "./aid-people.service";
import { AidApplication } from "./entities/aid-application.entity";
import { AidAttachment } from "./entities/aid-attachment.entity";
import { AidHouseholdMember } from "./entities/aid-household-member.entity";
import { AidHousehold } from "./entities/aid-household.entity";
import { AidKinshipEdge } from "./entities/aid-kinship-edge.entity";
import { AidPerson } from "./entities/aid-person.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      AidPerson,
      AidHousehold,
      AidHouseholdMember,
      AidKinshipEdge,
      AidApplication,
      AidAttachment,
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
    S3StorageModule,
  ],
  controllers: [
    AidPeopleController,
    AidHouseholdsController,
    AidApplicationsController,
  ],
  providers: [AidPeopleService, AidHouseholdsService, AidApplicationsService],
  exports: [
    AidPeopleService,
    AidHouseholdsService,
    AidApplicationsService,
    TypeOrmModule,
  ],
})
export class AidModule {}
