import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { PayfastService } from "./payfast.service";
import { PayfastController } from "./payfast.controller";
import { DonationsModule } from "src/donations/donations.module";
import { Donation } from "src/donations/entities/donation.entity";

@Module({
  imports: [DonationsModule, TypeOrmModule.forFeature([Donation])],
  controllers: [PayfastController],
  providers: [PayfastService],
  exports: [PayfastService],
})
export class PayfastModule {}
