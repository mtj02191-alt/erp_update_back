import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { MarriageGiftReportsModule } from "./reports/marriage-gift-reports.module";
import { PermissionsEntity } from "src/permissions/entities/permissions.entity";
import { PermissionsModule } from "src/permissions/permissions.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([PermissionsEntity]),
    MarriageGiftReportsModule,
    PermissionsModule,
  ],
  controllers: [],
  providers: [],
  exports: [MarriageGiftReportsModule],
})
export class MarriageGiftsModule {}
