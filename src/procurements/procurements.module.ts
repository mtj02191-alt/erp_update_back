import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
// import { ProcurementsController } from './procurements.controller';
import { ProcurementsService } from "./services/procurements.service";
import { ProcurementsEntity } from "./entities/procurements.entity/procurements.entity";
import { ProcurementsDailyReportsModule } from "./procurements_daily_reports/procurements-daily-reports.module";
import { PermissionsModule } from "src/permissions";

@Module({
  imports: [
    TypeOrmModule.forFeature([ProcurementsEntity]),
    ProcurementsDailyReportsModule,
    PermissionsModule,
  ],
  // controllers: [ProcurementsController],
  providers: [ProcurementsService],
  exports: [ProcurementsService],
})
export class ProcurementsModule {}
