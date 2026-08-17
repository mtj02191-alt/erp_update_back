import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  HttpStatus,
  Res,
  UseGuards,
} from "@nestjs/common";
import { Response } from "express";
import { JwtGuard } from "src/auth/jwt.guard";
import { PermissionsGuard } from "../../permissions/guards/permissions.guard";
import { RequiredPermissions } from "../../permissions/decorators/require-permission.decorator";
import { RecurringDonationsLedgerService } from "./recurring-donations-ledger.service";
import {
  RECURRING_DONATION_LIST_VIEW_GUARD,
  RECURRING_DONATION_VIEW_GUARD,
} from "../../permissions/recurring-donations-permissions.constants";

@Controller("recurring-donations")
@UseGuards(JwtGuard, PermissionsGuard)
export class RecurringDonationsController {
  constructor(
    private readonly ledgerService: RecurringDonationsLedgerService,
  ) {}

  @Post("search")
  @RequiredPermissions([...RECURRING_DONATION_LIST_VIEW_GUARD])
  async search(@Body() payload: Record<string, any>, @Res() res: Response) {
    try {
      const result = await this.ledgerService.search(payload);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Recurring donations fetched successfully",
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error: any) {
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error?.message || "Failed to fetch recurring donations",
        data: [],
        pagination: null,
      });
    }
  }

  @Get(":id")
  @RequiredPermissions([...RECURRING_DONATION_VIEW_GUARD])
  async findOne(@Param("id") id: string, @Res() res: Response) {
    try {
      const data = await this.ledgerService.findOne(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Recurring donation fetched successfully",
        data,
      });
    } catch (error: any) {
      const status =
        error?.status === 404 ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error?.message || "Failed to fetch recurring donation",
        data: null,
      });
    }
  }

  /** Same installment payment link the cron sends (email + WhatsApp). */
  @Post(":id/send-installment-link")
  @RequiredPermissions([...RECURRING_DONATION_VIEW_GUARD])
  async sendInstallmentLink(@Param("id") id: string, @Res() res: Response) {
    try {
      const data = await this.ledgerService.sendInstallmentPaymentLink(+id);
      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Installment payment link sent",
        data,
      });
    } catch (error: any) {
      const status =
        error?.status === 404 ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error?.message || "Failed to send installment payment link",
        data: null,
      });
    }
  }

  /** Admin: mark selected pending period dues as paid (no donor/donation deletes). */
  @Post(":id/mark-installments-paid")
  @RequiredPermissions([...RECURRING_DONATION_VIEW_GUARD])
  async markInstallmentsPaid(
    @Param("id") id: string,
    @Body() body: { installment_ids?: number[]; note?: string },
    @Res() res: Response,
  ) {
    try {
      const data = await this.ledgerService.markInstallmentsPaid(+id, {
        installmentIds: body?.installment_ids || [],
        note: body?.note,
      });
      return res.status(HttpStatus.OK).json({
        success: true,
        message: `Marked ${data.marked} installment(s) as paid`,
        data,
      });
    } catch (error: any) {
      const status =
        error?.status === 404 ? HttpStatus.NOT_FOUND : HttpStatus.BAD_REQUEST;
      return res.status(status).json({
        success: false,
        message: error?.message || "Failed to mark installments as paid",
        data: null,
      });
    }
  }
}
