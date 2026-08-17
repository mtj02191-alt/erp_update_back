import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PermissionsService } from "./permissions.service";
import { PermissionsGuard } from "./guards/permissions.guard";
import { PermissionsController } from "./permissions.controller";
// import { PermissionsSeeder } from './seeder/permissions.seeder';
import { PermissionsEntity } from "./entities/permissions.entity";
import { User } from "../users/user.entity";
import { DataScopeService } from "./data-scope/data-scope.service";
import { GeographicScopeService } from "./geographic-scope/geographic-scope.service";
import { City } from "../dms/geographic/cities/entities/city.entity";
import { Region } from "../dms/geographic/regions/entities/region.entity";
import { District } from "../dms/geographic/districts/entities/district.entity";
import { Country } from "../dms/geographic/countries/entities/country.entity";
import { Route } from "../dms/geographic/routes/entities/route.entity";
import { Tehsil } from "../dms/geographic/tehsils/entities/tehsil.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([
      PermissionsEntity,
      User,
      City,
      Region,
      District,
      Country,
      Route,
      Tehsil,
    ]),
  ],
  controllers: [PermissionsController],
  providers: [
    PermissionsService,
    PermissionsGuard,
    DataScopeService,
    GeographicScopeService,
    // PermissionsSeeder,
  ],
  exports: [
    PermissionsService,
    PermissionsGuard,
    DataScopeService,
    GeographicScopeService,
    // PermissionsSeeder,
  ],
})
export class PermissionsModule {}
