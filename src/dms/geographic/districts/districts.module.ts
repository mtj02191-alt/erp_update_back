import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { DistrictsService } from "./districts.service";
import { DistrictsController } from "./districts.controller";
import { District } from "./entities/district.entity";
import { Region } from "../regions/entities/region.entity";
import { Country } from "../countries/entities/country.entity";
import { JwtModule } from "@nestjs/jwt";
import { PermissionsModule } from "src/permissions";

@Module({
  imports: [
    TypeOrmModule.forFeature([District, Region, Country]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
  ],
  controllers: [DistrictsController],
  providers: [DistrictsService],
  exports: [DistrictsService, TypeOrmModule],
})
export class DistrictsModule {}
