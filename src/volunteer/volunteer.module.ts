import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { VolunteerService } from "./volunteer.service";
import { VolunteerController } from "./volunteer.controller";
import { VolunteerDmsController } from "./volunteer-dms.controller";
import { Volunteer } from "./entities/volunteer.entity";
import { PermissionsModule } from "src/permissions/permissions.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Volunteer]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
  ],
  controllers: [VolunteerController, VolunteerDmsController],
  providers: [VolunteerService],
  exports: [VolunteerService],
})
export class VolunteerModule {}
