import { Module } from "@nestjs/common";
import { TypeOrmModule } from "@nestjs/typeorm";
import { GoldSilverPriceService } from "./gold_silver_price.service";
import { GoldSilverPriceController } from "./gold_silver_price.controller";
import { GoldSilverPrice } from "./entities/gold_silver_price.entity";
import { GoldSilverPriceCronService } from "./gold-silver-price-cron.service";

@Module({
  imports: [
    TypeOrmModule.forFeature([GoldSilverPrice]),
    // Note: ScheduleModule should be imported once in AppModule, not here
  ],
  controllers: [GoldSilverPriceController],
  providers: [GoldSilverPriceService, GoldSilverPriceCronService],
  exports: [GoldSilverPriceService],
})
export class GoldSilverPriceModule {}
