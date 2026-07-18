import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { UserDonorsService } from "./user_donors.service";
import { UserDonorsController } from "./user_donors.controller";
import { UserDonor } from "./entities/user_donor.entity";
import { UsersModule } from "../../users/users.module";
import { DonorModule } from "../donor/donor.module";
import { PermissionsModule } from "src/permissions";
import { JwtModule } from "@nestjs/jwt";

@Module({
  imports: [
    TypeOrmModule.forFeature([UserDonor]),
    UsersModule,
    DonorModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
  ],
  controllers: [UserDonorsController],
  providers: [UserDonorsService],
  exports: [UserDonorsService], // Export for use in other modules
})
export class UserDonorsModule {}
