import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { RationReportsModule } from "./reports/ration-reports.module";
import { PermissionsModule, PermissionsService } from "src/permissions";
import { JwtModule } from "@nestjs/jwt";
import { PermissionsEntity } from "src/permissions/entities/permissions.entity";
import { RationReport } from "./reports/entities/ration-report.entity";

@Module({
  imports: [
    TypeOrmModule.forFeature([PermissionsEntity, RationReport]),
    RationReportsModule,
    PermissionsModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: "1h" },
    }),
  ],
  controllers: [],
  providers: [PermissionsService],
  exports: [RationReportsModule],
})
export class RationModule {}
