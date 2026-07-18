import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { CitiesService } from "./cities.service";
import { CitiesController } from "./cities.controller";
import { City } from "./entities/city.entity";
import { Tehsil } from "../tehsils/entities/tehsil.entity";
import { District } from "../districts/entities/district.entity";
import { Region } from "../regions/entities/region.entity";
import { Country } from "../countries/entities/country.entity";
import { JwtModule } from "@nestjs/jwt";
import { PermissionsModule } from "src/permissions";

@Module({
  imports: [
    TypeOrmModule.forFeature([City, Tehsil, District, Region, Country]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
  ],
  controllers: [CitiesController],
  providers: [CitiesService],
  exports: [CitiesService, TypeOrmModule],
})
export class CitiesModule {}
