import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UsersService } from "./users.service";
import { UserPerformanceService } from "./user-performance.service";
import { User } from "./user.entity";
import { PermissionsEntity } from "../permissions/entities/permissions.entity";
import { JwtModule } from "@nestjs/jwt";
import { UsersController } from "./user.controller";
import { PermissionsModule } from "../permissions/permissions.module";
import { GeographicAssignmentModule } from "../dms/geographic/geographic-assignment/geographic-assignment.module";
import { Task } from "../tasks/entities/task.entity";
import { Donor } from "../dms/donor/entities/donor.entity";
import { Donation } from "../donations/entities/donation.entity";
import { DonorFollowup } from "../dms/donor_relationship/entities/donor-followup.entity";
import { DonorInteraction } from "../dms/donor_relationship/entities/donor-interaction.entity";
import { DonationBox } from "../dms/donation_box/entities/donation-box.entity";
import { DonationBoxDonation } from "../dms/donation_box/donation_box_donation/entities/donation_box_donation.entity";
import { EmailModule } from "../email/email.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      User,
      PermissionsEntity,
      Task,
      Donor,
      Donation,
      DonorFollowup,
      DonorInteraction,
      DonationBox,
      DonationBoxDonation,
    ]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
    GeographicAssignmentModule,
    EmailModule,
  ],
  controllers: [UsersController],
  providers: [UsersService, UserPerformanceService],
  exports: [UsersService],
})
export class UsersModule {}
