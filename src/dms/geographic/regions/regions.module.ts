import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RegionsService } from "./regions.service";
import { RegionsController } from "./regions.controller";
import { Region } from "./entities/region.entity";
import { Country } from "../countries/entities/country.entity";
import { JwtModule } from "@nestjs/jwt";
import { PermissionsModule } from "src/permissions";

@Module({
  imports: [
    TypeOrmModule.forFeature([Region, Country]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || "your-secret-key",
      signOptions: { expiresIn: "24h" },
    }),
    PermissionsModule,
  ],
  controllers: [RegionsController],
  providers: [RegionsService],
  exports: [RegionsService, TypeOrmModule],
})
export class RegionsModule {}
