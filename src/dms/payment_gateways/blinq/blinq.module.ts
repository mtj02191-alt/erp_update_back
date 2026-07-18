import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { BlinqService } from "./blinq.service";
import { BlinqController } from "./blinq.controller";
import { DonationsModule } from "src/donations/donations.module";
import { Donation } from "src/donations/entities/donation.entity";

@Module({
  imports: [TypeOrmModule.forFeature([Donation]), DonationsModule],
  controllers: [BlinqController],
  providers: [BlinqService],
  exports: [BlinqService],
})
export class BlinqModule {}
