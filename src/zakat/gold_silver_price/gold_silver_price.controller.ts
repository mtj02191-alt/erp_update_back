import {
  Controller,
  Get,
  Query,
  HttpStatus,
  Res,
  BadRequestException,
} from "@nestjs/common";
import { Response } from "express";
import { GoldSilverPriceService } from "./gold_silver_price.service";

@Controller("gold-silver-price")
export class GoldSilverPriceController {
  constructor(
    private readonly goldSilverPriceService: GoldSilverPriceService,
  ) {}

  /**
   * GET /gold-silver-price/fetch
   * Fetches prices from external API and stores in database
   * Query params:
   *   - date (optional): YYYY-MM-DD format to fetch price for specific date
   */
  @Get("fetch")
  async fetchAndStore(@Query("date") date?: string, @Res() res?: Response) {
    try {
      // Validate date format if provided
      if (date) {
        const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
        if (!dateRegex.test(date)) {
          throw new BadRequestException(
            "Invalid date format. Use YYYY-MM-DD format",
          );
        }
      }

      const result = await this.goldSilverPriceService.fetchAndStore(date);

      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Price fetched and stored successfully",
        data: result,
      });
    } catch (error) {
      const status = error.status || HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error.message || "Failed to fetch and store price",
        data: null,
      });
    }
  }

  /**
   * GET /gold-silver-price/latest
   * Returns the latest gold and silver prices from database
   */
  @Get("latest")
  async getLatest(@Res() res?: Response) {
    try {
      const result = await this.goldSilverPriceService.getLatestPrice();

      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Latest price retrieved successfully",
        data: result,
      });
    } catch (error) {
      const status = error.status || HttpStatus.NOT_FOUND;
      return res.status(status).json({
        success: false,
        message: error.message || "Failed to get latest price",
        data: null,
      });
    }
  }

  /**
   * GET /gold-silver-price/date
   * Returns price for a specific date
   * Query params:
   *   - date (required): YYYY-MM-DD format
   */
  @Get("date")
  async getByDate(@Query("date") date: string, @Res() res?: Response) {
    try {
      if (!date) {
        throw new BadRequestException(
          "Date parameter is required. Use format: YYYY-MM-DD",
        );
      }

      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!dateRegex.test(date)) {
        throw new BadRequestException(
          "Invalid date format. Use YYYY-MM-DD format",
        );
      }

      const result = await this.goldSilverPriceService.getPriceByDate(date);

      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Price retrieved successfully",
        data: result,
      });
    } catch (error) {
      const status = error.status || HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error.message || "Failed to get price by date",
        data: null,
      });
    }
  }

  /**
   * GET /gold-silver-price
   * Returns all prices with pagination
   * Query params:
   *   - page (optional): Page number (default: 1)
   *   - pageSize (optional): Items per page (default: 10)
   */
  @Get()
  async findAll(
    @Query("page") page?: string,
    @Query("pageSize") pageSize?: string,
    @Res() res?: Response,
  ) {
    try {
      const pageNum = page ? parseInt(page, 10) : 1;
      const pageSizeNum = pageSize ? parseInt(pageSize, 10) : 10;

      if (
        isNaN(pageNum) ||
        isNaN(pageSizeNum) ||
        pageNum < 1 ||
        pageSizeNum < 1
      ) {
        throw new BadRequestException(
          "Page and pageSize must be valid positive numbers",
        );
      }

      const result = await this.goldSilverPriceService.findAll(
        pageNum,
        pageSizeNum,
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Prices retrieved successfully",
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      const status = error.status || HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error.message || "Failed to get prices",
        data: null,
      });
    }
  }
}
