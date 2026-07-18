import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { DreamSchool } from "./entities/dream_school.entity";
import { DreamSchoolsService } from "./dream_schools.service";
import { DreamSchoolsController } from "./dream_schools.controller";
import { PermissionsModule } from "src/permissions";

@Module({
  imports: [
    TypeOrmModule.forFeature([DreamSchool]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
  ],
  controllers: [DreamSchoolsController],
  providers: [DreamSchoolsService],
  exports: [DreamSchoolsService, TypeOrmModule],
})
export class DreamSchoolsModule {}
