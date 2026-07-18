import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  HttpStatus,
  Res,
} from "@nestjs/common";
import { Response } from "express";
import { BlinqService } from "./blinq.service";
import { CreateBlinqDto } from "./dto/create-blinq.dto";
import { UpdateBlinqDto } from "./dto/update-blinq.dto";

@Controller("blinq")
export class BlinqController {
  constructor(private readonly blinqService: BlinqService) {}

  @Post()
  create(@Body() createBlinqDto: CreateBlinqDto) {
    return this.blinqService.create(createBlinqDto);
  }

  @Patch(":id")
  update(@Param("id") id: string, @Body() updateBlinqDto: UpdateBlinqDto) {
    return this.blinqService.update(+id, updateBlinqDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.blinqService.remove(+id);
  }

  // Get all Blinq donations with optional status filter
  @Get("donations")
  async getBlinqDonations(@Query("status") status?: string) {
    try {
      const result = await this.blinqService.getBlinqDonations(status);
      return {
        success: true,
        message: `Blinq donations retrieved successfully${status ? ` with status: ${status}` : ""}`,
        data: result?.data || [],
      };
    } catch (error) {
      throw error;
    }
  }

  // Get Blinq donation statistics
  @Get("stats")
  async getBlinqStats(@Res() res?: Response) {
    try {
      const stats = await this.blinqService.getBlinqStats();

      if (res) {
        return res.status(HttpStatus.OK).json({
          success: true,
          message: "Blinq donation statistics retrieved successfully",
          data: stats,
        });
      }

      return stats;
    } catch (error) {
      if (res) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: error.message,
          data: null,
        });
      }
      throw error;
    }
  }

  // ============================================
  // BLINQ API INTEGRATION ENDPOINTS
  // ============================================

  // Get Blinq authentication token
  @Get("auth/token")
  async getBlinqAuthToken(@Res() res?: Response) {
    try {
      const token = await this.blinqService.getBlinqAuthToken();

      if (res) {
        return res.status(HttpStatus.OK).json({
          success: true,
          message: "Blinq authentication token retrieved successfully",
          data: { token },
        });
      }

      return { token };
    } catch (error) {
      if (res) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: error.message,
          data: null,
        });
      }
      throw error;
    }
  }

  // Check invoice status
  @Get("invoice/status/:paymentCode")
  async checkInvoiceStatus(
    @Param("paymentCode") paymentCode: string,
    @Res() res?: Response,
  ) {
    try {
      const result = await this.blinqService.checkInvoiceStatus(paymentCode);

      if (res) {
        return res.status(HttpStatus.OK).json({
          success: true,
          message: "Invoice status retrieved successfully",
          data: result,
        });
      }

      return result;
    } catch (error) {
      if (res) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: error.message,
          data: null,
        });
      }
      throw error;
    }
  }

  // Get paid invoices for date range
  @Get("invoices/paid")
  async getPaidInvoices(
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Res() res?: Response,
  ) {
    try {
      const result = await this.blinqService.getPaidInvoices(
        startDate ? new Date(startDate) : new Date(),
        endDate ? new Date(endDate) : new Date(),
      );

      if (res) {
        return res.status(HttpStatus.OK).json({
          success: true,
          message: "Paid invoices retrieved successfully",
          data: result,
        });
      }

      return result;
    } catch (error) {
      if (res) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: error.message,
          data: null,
        });
      }
      throw error;
    }
  }

  // Get comprehensive invoice information
  @Get("invoice/info/:paymentCode")
  async getInvoiceInfo(
    @Param("paymentCode") paymentCode: string,
    @Res() res?: Response,
  ) {
    try {
      const result = await this.blinqService.getInvoiceInfo(paymentCode);

      if (res) {
        return res.status(HttpStatus.OK).json({
          success: true,
          message: "Invoice information retrieved successfully",
          data: result,
        });
      }

      return result;
    } catch (error) {
      if (res) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: error.message,
          data: null,
        });
      }
      throw error;
    }
  }

  // Simple and efficient Blinq sync with query parameters
  @Get("sync")
  async syncBlinqDonations(
    @Query("startDate") startDate?: string,
    @Query("endDate") endDate?: string,
    @Res() res?: Response,
  ) {
    try {
      const result = await this.blinqService.syncBlinqDonations(
        startDate,
        endDate,
      );

      if (res) {
        return res.status(HttpStatus.OK).json({
          success: true,
          message: "Blinq donations synced successfully",
          data: result,
        });
      }

      return result;
    } catch (error) {
      if (res) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: error.message,
          data: null,
        });
      }
      throw error;
    }
  }
}
