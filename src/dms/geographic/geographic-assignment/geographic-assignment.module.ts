import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { PermissionsModule } from "src/permissions";
import { Country } from "../countries/entities/country.entity";
import { Region } from "../regions/entities/region.entity";
import { District } from "../districts/entities/district.entity";
import { Tehsil } from "../tehsils/entities/tehsil.entity";
import { City } from "../cities/entities/city.entity";
import { Route } from "../routes/entities/route.entity";
import { GeographicAssignmentService } from "./geographic-assignment.service";
import { GeographicAssignmentController } from "./geographic-assignment.controller";

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
    TypeOrmModule.forFeature([
      Country,
      Region,
      District,
      Tehsil,
      City,
      Route,
    ]),
  ],
  controllers: [GeographicAssignmentController],
  providers: [GeographicAssignmentService],
  exports: [GeographicAssignmentService],
})
export class GeographicAssignmentModule {}
