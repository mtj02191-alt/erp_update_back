import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { GoldSilverPriceService } from "./gold_silver_price.service";

@Injectable()
export class GoldSilverPriceCronService {
  private readonly logger = new Logger(GoldSilverPriceCronService.name);

  constructor(
    private readonly goldSilverPriceService: GoldSilverPriceService,
  ) {}

  /**
   * Daily cron job to fetch and update gold/silver prices
   * Runs every day at 9:00 AM (adjust timezone as needed)
   * Cron expression: '0 9 * * *' = At 09:00 AM every day
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM, {
    name: "fetch-daily-gold-silver-prices",
    timeZone: "Asia/Karachi", // Adjust to your timezone
  })
  async handleDailyPriceUpdate() {
    try {
      this.logger.log("Starting daily gold/silver price update...");

      // Fetch today's price (no date parameter = current date)
      const result = await this.goldSilverPriceService.fetchAndStore();

      this.logger.log(
        `Daily price update successful. Gold: ${result.gold_price}, Silver: ${result.silver_price}, Date: ${result.price_date}`,
      );
    } catch (error) {
      this.logger.error(
        `Daily price update failed: ${error.message}`,
        error.stack,
      );
      // Don't throw - allow cron to continue running
    }
  }

  /**
   * Alternative: Run at a specific time (e.g., 9:00 AM every day)
   * Uncomment and adjust timezone as needed
   */
  // @Cron('0 9 * * *', {
  //   name: 'fetch-daily-gold-silver-prices-custom',
  //   timeZone: 'Asia/Karachi',
  // })
  // async handleDailyPriceUpdateCustom() {
  //   this.handleDailyPriceUpdate();
  // }
}
