import { Module } from "@nestjs/common";
import { CountriesModule } from "./countries/countries.module";
import { RegionsModule } from "./regions/regions.module";
import { DistrictsModule } from "./districts/districts.module";
import { TehsilsModule } from "./tehsils/tehsils.module";
import { CitiesModule } from "./cities/cities.module";
import { RoutesModule } from "./routes/routes.module";
import { PermissionsModule } from "src/permissions";
import { JwtModule } from "@nestjs/jwt";

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
    CountriesModule,
    RegionsModule,
    DistrictsModule,
    TehsilsModule,
    CitiesModule,
    RoutesModule,
  ],
  exports: [
    CountriesModule,
    RegionsModule,
    DistrictsModule,
    TehsilsModule,
    CitiesModule,
    RoutesModule,
  ],
})
export class GeographicModule {}
