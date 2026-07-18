import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RoutesService } from "./routes.service";
import { RoutesController } from "./routes.controller";
import { Route } from "./entities/route.entity";
import { City } from "../cities/entities/city.entity";
import { Region } from "../regions/entities/region.entity";
import { Country } from "../countries/entities/country.entity";
import { JwtModule } from "@nestjs/jwt";
import { PermissionsModule } from "src/permissions";

@Module({
  imports: [
    TypeOrmModule.forFeature([Route, City, Region, Country]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
  ],
  controllers: [RoutesController],
  providers: [RoutesService],
  exports: [RoutesService, TypeOrmModule],
})
export class RoutesModule {}
