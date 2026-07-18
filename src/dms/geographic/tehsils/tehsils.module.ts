import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { TehsilsService } from "./tehsils.service";
import { TehsilsController } from "./tehsils.controller";
import { Tehsil } from "./entities/tehsil.entity";
import { District } from "../districts/entities/district.entity";
import { Region } from "../regions/entities/region.entity";
import { Country } from "../countries/entities/country.entity";
import { JwtModule } from "@nestjs/jwt";
import { PermissionsModule } from "src/permissions";

@Module({
  imports: [
    TypeOrmModule.forFeature([Tehsil, District, Region, Country]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
  ],
  controllers: [TehsilsController],
  providers: [TehsilsService],
  exports: [TehsilsService, TypeOrmModule],
})
export class TehsilsModule {}
