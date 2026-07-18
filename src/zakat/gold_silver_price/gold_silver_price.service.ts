import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from "@nestjs/common";
import { InjectRepository } from "@nestjs/typeorm";
import { Repository } from "typeorm";
import { GoldSilverPrice } from "./entities/gold_silver_price.entity";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

@Injectable()
export class GoldSilverPriceService {
  private readonly logger = new Logger(GoldSilverPriceService.name);
  private readonly API_BASE_URL = "https://api.metalpriceapi.com/v1";
  private readonly API_KEY: string;

  constructor(
    @InjectRepository(GoldSilverPrice)
    private readonly goldSilverPriceRepository: Repository<GoldSilverPrice>,
    private readonly configService: ConfigService,
  ) {
    this.API_KEY =
      this.configService.get<string>("METAL_PRICE_API_KEY") ||
      process.env.METAL_PRICE_API_KEY ||
      "";
    if (!this.API_KEY) {
      this.logger.warn(
        "METAL_PRICE_API_KEY not configured. Please set it in environment variables.",
      );
    }
  }

  /**
   * Fetch gold and silver prices from Metal Price API
   * @param date - Optional date parameter (YYYY-MM-DD format) for historical data
   * @returns Promise with gold and silver prices
   */
  async fetchFromAPI(
    date?: string,
  ): Promise<{ gold_price: number; silver_price: number; date: string }> {
    try {
      if (!this.API_KEY) {
        throw new BadRequestException(
          "METAL_PRICE_API_KEY is not configured. Please set it in environment variables.",
        );
      }

      // Construct API URL
      // For latest: /v1/latest
      // For historical: /v1/{date} (format: YYYY-MM-DD)
      let url: string;
      if (date) {
        // Historical data endpoint
        url = `${this.API_BASE_URL}/${date}?api_key=${this.API_KEY}&base=PKR&currencies=XAU,XAG`;
      } else {
        // Latest data endpoint
        url = `${this.API_BASE_URL}/latest?api_key=${this.API_KEY}&base=PKR&currencies=XAU,XAG`;
      }

      this.logger.log(
        `Fetching prices from Metal Price API: ${date ? `Historical (${date})` : "Latest"}`,
      );

      const response = await axios.get(url, {
        timeout: 15000, // 15 seconds timeout
        headers: {
          Accept: "application/json",
        },
      });

      const data = response.data;

      // Metal Price API response format:
      // {
      //   "success": true,
      //   "base": "PKR",
      //   "date": "2024-01-15",
      //   "rates": {
      //     "XAU": 123.45,  // Gold price per ounce in PKR
      //     "XAG": 12.34     // Silver price per ounce in PKR
      //   }
      // }

      if (!data.success) {
        throw new BadRequestException(
          `API returned unsuccessful response: ${data.error || "Unknown error"}`,
        );
      }

      if (!data.rates || !data.rates.XAU || !data.rates.XAG) {
        this.logger.error(
          "Unexpected API response structure:",
          JSON.stringify(data),
        );
        throw new BadRequestException(
          "API response missing required rate data (XAU or XAG)",
        );
      }

      const goldPrice = parseFloat(data.rates.XAU);
      const silverPrice = parseFloat(data.rates.XAG);
      const priceDate = data.date || new Date().toISOString().split("T")[0];

      if (isNaN(goldPrice) || isNaN(silverPrice)) {
        throw new BadRequestException("Invalid price values received from API");
      }

      this.logger.log(
        `Successfully fetched prices - Gold: ${goldPrice} PKR/oz, Silver: ${silverPrice} PKR/oz, Date: ${priceDate}`,
      );

      return {
        gold_price: goldPrice,
        silver_price: silverPrice,
        date: priceDate,
      };
    } catch (error) {
      this.logger.error(
        `Failed to fetch prices from API: ${error.message}`,
        error.stack,
      );
      if (error.response) {
        const status = error.response.status;
        const statusText = error.response.statusText;
        const errorData = error.response.data;
        this.logger.error(`API Error Response: ${JSON.stringify(errorData)}`);
        throw new BadRequestException(
          `API Error (${status} ${statusText}): ${errorData?.error || errorData?.message || "Unknown error"}`,
        );
      }
      if (error.code === "ECONNABORTED") {
        throw new BadRequestException("API request timeout");
      }
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException(`Failed to fetch prices: ${error.message}`);
    }
  }

  /**
   * Store gold and silver prices in database
   * @param goldPrice - Gold price
   * @param silverPrice - Silver price
   * @param priceDate - Date of the price (YYYY-MM-DD format)
   * @param apiResponse - Optional raw API response
   * @returns Saved GoldSilverPrice entity
   */
  async storePrice(
    goldPrice: number,
    silverPrice: number,
    priceDate: string,
    apiResponse?: string,
  ): Promise<GoldSilverPrice> {
    try {
      const date = new Date(priceDate);

      // Check if price for this date already exists
      const existing = await this.goldSilverPriceRepository.findOne({
        where: { price_date: date },
      });

      if (existing) {
        // Update existing record
        existing.gold_price = goldPrice;
        existing.silver_price = silverPrice;
        if (apiResponse) {
          existing.api_response = apiResponse;
        }
        this.logger.log(`Updating price for date: ${priceDate}`);
        return await this.goldSilverPriceRepository.save(existing);
      } else {
        // Create new record
        const newPrice = this.goldSilverPriceRepository.create({
          gold_price: goldPrice,
          silver_price: silverPrice,
          price_date: date,
          api_response: apiResponse,
        });
        this.logger.log(`Creating new price record for date: ${priceDate}`);
        return await this.goldSilverPriceRepository.save(newPrice);
      }
    } catch (error) {
      this.logger.error(`Failed to store price: ${error.message}`, error.stack);
      throw new BadRequestException(`Failed to store price: ${error.message}`);
    }
  }

  /**
   * Fetch from API and store in database
   * @param date - Optional date parameter (YYYY-MM-DD format)
   * @returns Saved GoldSilverPrice entity
   */
  async fetchAndStore(date?: string): Promise<GoldSilverPrice> {
    try {
      const priceData = await this.fetchFromAPI(date);
      const apiResponse = JSON.stringify(priceData);

      return await this.storePrice(
        priceData.gold_price,
        priceData.silver_price,
        priceData.date,
        apiResponse,
      );
    } catch (error) {
      this.logger.error(`Failed to fetch and store price: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get the latest gold and silver prices
   * If no record exists in database, fetches from API and stores it
   * @returns Latest GoldSilverPrice entity
   */
  async getLatestPrice(): Promise<GoldSilverPrice> {
    try {
      const latest = await this.goldSilverPriceRepository.findOne({
        where: { is_archived: false },
        order: { price_date: "DESC", created_at: "DESC" },
      });

      // If no record exists, fetch from API and store it
      if (!latest) {
        this.logger.log(
          "No price records found in database. Fetching from API...",
        );
        try {
          const newPrice = await this.fetchAndStore();
          this.logger.log("Successfully fetched and stored price from API");
          return newPrice;
        } catch (fetchError) {
          this.logger.error(`Failed to fetch from API: ${fetchError.message}`);
          throw new NotFoundException(
            `No price records found and failed to fetch from API: ${fetchError.message}`,
          );
        }
      }

      return latest;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to get latest price: ${error.message}`);
      throw new BadRequestException(
        `Failed to get latest price: ${error.message}`,
      );
    }
  }

  /**
   * Get price by specific date
   * @param date - Date string (YYYY-MM-DD format)
   * @returns GoldSilverPrice entity for the date
   */
  async getPriceByDate(date: string): Promise<GoldSilverPrice> {
    try {
      const priceDate = new Date(date);

      const price = await this.goldSilverPriceRepository.findOne({
        where: {
          price_date: priceDate,
          is_archived: false,
        },
      });

      if (!price) {
        throw new NotFoundException(`No price found for date: ${date}`);
      }

      return price;
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error(`Failed to get price by date: ${error.message}`);
      throw new BadRequestException(
        `Failed to get price by date: ${error.message}`,
      );
    }
  }

  /**
   * Get all prices with pagination
   * @param page - Page number (default: 1)
   * @param pageSize - Items per page (default: 10)
   * @returns Paginated list of prices
   */
  async findAll(page: number = 1, pageSize: number = 10) {
    try {
      const skip = (page - 1) * pageSize;

      const [data, total] = await this.goldSilverPriceRepository.findAndCount({
        where: { is_archived: false },
        order: { price_date: "DESC", created_at: "DESC" },
        skip,
        take: pageSize,
      });

      return {
        data,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
          hasNext: page < Math.ceil(total / pageSize),
          hasPrev: page > 1,
        },
      };
    } catch (error) {
      this.logger.error(`Failed to get all prices: ${error.message}`);
      throw new BadRequestException(
        `Failed to get all prices: ${error.message}`,
      );
    }
  }
}
