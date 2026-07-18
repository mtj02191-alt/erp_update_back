import {
  Controller,
  Get,
  Query,
  HttpStatus,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import { DonationsService } from "./donations.service";
import { ConditionalJwtGuard } from "src/auth/guards/conditional-jwt.guard";
import { PermissionsGuard } from "src/permissions/guards/permissions.guard";
import { RequiredPermissions } from "src/permissions";
import { DateRangeOptions } from "src/utils/summary/date-range.util";

@Controller("donations-summary")
// @UseGuards(ConditionalJwtGuard, PermissionsGuard)
export class DonationsSummaryController {
  constructor(private readonly donationsService: DonationsService) {}

  // @Get()
  // @RequiredPermissions([
  //       'fund_raising.donations.view',
  //       'super_admin',
  //       'fund_raising_manager',
  //   ])
  // async getSummary(
  //   @Query('duration') duration?: 'year' | 'month' | 'week' | 'day' | 'custom',
  //   @Query('year') year?: string,
  //   @Query('month') month?: string,
  //   @Query('week') week?: string,
  //   @Query('day') day?: string,
  //   @Query('start_date') startDate?: string,
  //   @Query('end_date') endDate?: string,
  //   @Res() res?: Response,
  // ) {
  //   try {
  //     // Build options object
  //     const options: DateRangeOptions = {};

  //     if (duration) {
  //       options.duration = duration;
  //     }

  //     // Parse numeric query params
  //     if (year) {
  //       options.year = parseInt(year, 10);
  //     }

  //     if (month) {
  //       options.month = parseInt(month, 10);
  //     }

  //     if (week) {
  //       options.week = parseInt(week, 10);
  //     }

  //     if (day) {
  //       options.day = parseInt(day, 10);
  //     }

  //     if (startDate) {
  //       options.start_date = startDate;
  //     }

  //     if (endDate) {
  //       options.end_date = endDate;
  //     }

  //     const result = await this.donationsService.getSummary(options);

  //     if (res) {
  //       return res.status(HttpStatus.OK).json({
  //         success: true,
  //         message: 'Donation summary retrieved successfully',
  //         data: result,
  //       });
  //     }

  //     return result;
  //   } catch (error) {
  //     if (res) {
  //       return res.status(HttpStatus.BAD_REQUEST).json({
  //         success: false,
  //         message: error.message,
  //         data: null,
  //       });
  //     }
  //     throw error;
  //   }
  // }
}
