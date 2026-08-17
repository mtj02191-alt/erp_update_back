import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { JwtModule } from "@nestjs/jwt";
import { DmsCronsService } from "./dms-crons.service";
import { DmsCronsController } from "./dms-crons.controller";
import { Donation } from "../../donations/entities/donation.entity";
import { DonationsModule } from "../../donations/donations.module";
import { PermissionsModule } from "src/permissions/permissions.module";
import { ManualRecurringModule } from "../../dms/manual_recurring/manual-recurring.module";
import { DmsTodosModule } from "../../dms/todos/dms-todos.module";

@Module({
  imports: [
    TypeOrmModule.forFeature([Donation]),
    DonationsModule,
    PermissionsModule,
    ManualRecurringModule,
    DmsTodosModule,
  ],
  providers: [DmsCronsService],
  controllers: [DmsCronsController],
})
export class DmsCronsModule {}
