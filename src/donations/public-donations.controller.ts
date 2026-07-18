import {
  Controller,
  Get,
  Query,
  HttpStatus,
  Res,
  Post,
  Body,
  Param,
  Req,
} from "@nestjs/common";
import { Request, Response } from "express";
import { DonationsService } from "./donations.service";
import { DonorService } from "src/dms/donor/donor.service";

@Controller("donations/public")
export class PublicDonationsController {
  constructor(
    private readonly donationsService: DonationsService,
    private readonly donorService: DonorService,
  ) {}

  // Public endpoint for uptime monitoring - NO GUARDS
  @Get("get-donation-apistatus")
  async getDonationApiStatus(@Res() res: Response) {
    try {
      return res.status(HttpStatus.OK).json({
        success: true,
        status: "active",
        message: "Donations API is available",
      });
    } catch (error) {
      return res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
        success: false,
        status: "error",
        message: "Donations API error",
        error: error.message,
      });
    }
  }

  // Public PayFast IPN endpoint - NO GUARDS
  @Post("payfast/ipn")
  async handlePayfastIpn(@Body() payload: any, @Res() res: Response) {
    try {
      const result = await this.donationsService.handlePayfastIpn(payload);

      return res.status(HttpStatus.OK).json({
        success: true,
        message: "IPN received successfully",
        basket_id: result.basket_id,
        batching: result.batching || null,
      });
    } catch (error) {
      console.error("IPN processing error:", error.message);

      // Still return 200 to prevent PayFast retries
      return res.status(HttpStatus.OK).json({
        success: false,
        message: "IPN processing error",
        error: error.message,
      });
    }
  }

  // Public endpoint to update donation status - NO GUARDS
  @Get("update-status")
  async updateDonationStatus(
    @Query("id") id: string,
    @Query("order_id") order_id: string,
    @Query("status") status: string,
    @Res() res: Response,
  ) {
    try {
      const result = await this.donationsService.updateDonationFromPublic(
        id,
        order_id,
        status,
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Donation status updated successfully",
        data: result,
      });
    } catch (error) {
      console.error("Update status error:", error.message);

      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: "Failed to update donation status",
        error: error.message,
      });
    }
  }

  // Public Stripe webhook - NO GUARDS (raw body set in main.ts for this route)
  @Post("stripe/webhook")
  async handleStripeWebhook(@Req() req: Request, @Res() res: Response) {
    try {
      const rawBody = req.body as Buffer;
      const signature = req.headers["stripe-signature"] as string;
      if (!rawBody || !signature) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: "Missing raw body or stripe-signature header",
        });
      }
      const result = await this.donationsService.handleStripeWebhook(
        rawBody,
        signature,
      );
      return res
        .status(HttpStatus.OK)
        .json({ received: result.received, donationId: result.donationId });
    } catch (error) {
      console.error("Stripe webhook error:", error.message);
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: "Webhook signature verification failed or processing error",
        error: error.message,
      });
    }
  }

  // Public Blinq callback endpoint - NO GUARDS
  @Post("blinq/callback")
  async handleBlinqCallback(@Body() payload: any, @Res() res: Response) {
    try {
      const result = await this.donationsService.handleBlinqCallback(payload);

      // Always return 200 OK as per Blinq documentation
      return res.status(HttpStatus.OK).json(result);
    } catch (error) {
      console.error("Blinq callback error:", error.message);

      // Still return 200 OK to prevent Blinq retries
      return res.status(HttpStatus.OK).json({
        code: "01",
        message: "Internal server error",
        status: "failure",
        invoice_number: payload.invoice_number || "unknown",
      });
    }
  }

  // Public endpoint to get failed transaction with donor information - NO GUARDS
  @Get("failed-transaction/:id")
  async getFailedTransaction(@Param("id") id: string, @Res() res: Response) {
    try {
      const donation = await this.donationsService.findOne(+id);

      return res.status(HttpStatus.OK).json({
        success: true,
        message: "Failed transaction retrieved successfully",
        data: donation,
      });
    } catch (error) {
      const status = error.message.includes("not found")
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;

      return res.status(status).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  // Public Blinq uptime status endpoint - NO GUARDS
  // Tests Blinq API connectivity by getting access token and creating a test invoice
  // @Get('blinq/status')
  async getBlinqStatus(@Res() res: Response) {
    try {
      // Use dummy data for uptime check (don't store in database)
      const testInvoiceNumber = `TEST-${Date.now()}`;
      const testAmount = 100; // Minimum test amount
      const testCustomerName = "MTJ Foundation Uptime Check";

      // Test 1: Get access token
      const authToken = await this.donationsService.getBlinqAccessToken();

      if (!authToken) {
        return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
          success: false,
          status: "unavailable",
          message: "Blinq authentication failed",
          details: {
            authToken: false,
            invoiceCreated: false,
          },
        });
      }

      // Test 2: Create test invoice
      const invoiceResult = await this.donationsService.generateBlinqInvoice(
        testInvoiceNumber,
        testAmount,
        testCustomerName,
        authToken,
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        status: "active",
        message: "Blinq API is operational",
        details: {
          authToken: true,
          invoiceCreated: true,
          testInvoiceNumber: testInvoiceNumber,
          paymentUrl: invoiceResult.paymentUrl ? "Generated" : "Not available",
          paymentCode: invoiceResult.paymentCode,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Blinq status check error:", error.message);

      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        success: false,
        status: "unavailable",
        message: "Blinq API is not available",
        error: error.message,
        details: {
          authToken: false,
          invoiceCreated: false,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  // Public PayFast uptime status endpoint - NO GUARDS
  // Tests PayFast API connectivity by getting access token
  @Get("payfast/status")
  async getPayfastStatus(@Res() res: Response) {
    try {
      // Use dummy data for uptime check (don't store in database)
      const testBasketId = `TEST-${Date.now()}`;
      const testAmount = 100; // Minimum test amount

      // Test: Get access token from PayFast
      const payfastResponse = await this.donationsService.getPayfastAccessToken(
        testBasketId,
        testAmount,
      );

      // Check if response contains access token or success indicator
      const hasAccessToken =
        payfastResponse?.ACCESS_TOKEN ||
        payfastResponse?.access_token ||
        payfastResponse?.AccessToken ||
        payfastResponse?.status === "success" ||
        payfastResponse?.success === true;

      return res.status(HttpStatus.OK).json({
        success: true,
        status: "active",
        message: "PayFast API is operational",
        details: {
          accessToken: hasAccessToken,
          testBasketId: testBasketId,
          testAmount: testAmount,
          responseReceived: !!payfastResponse,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("PayFast status check error:", error.message);

      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        success: false,
        status: "unavailable",
        message: "PayFast API is not available",
        error: error.message,
        details: {
          accessToken: false,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  // Public endpoint: update Meezan status ONLY from payload (no Meezan verification) - NO GUARDS
  @Post("meezan/update-by-payload")
  async updateMeezanDonationByPayload(
    @Body()
    payload: {
      donationId: number;
      status?: string;
      errorCode?: string;
      errorMessage?: string;
    },
    @Res() res: Response,
  ) {
    try {
      if (!payload.donationId) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: "donationId is required",
        });
      }

      const result = await this.donationsService.updateMeezanStatusFromPayload(
        payload.donationId,
        {
          status: payload.status,
          errorCode: payload.errorCode,
          errorMessage: payload.errorMessage,
        },
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        message: result.message,
        data: {
          donationId: payload.donationId,
          status: result.donation.status,
          updated: result.updated,
        },
      });
    } catch (error) {
      const status = error.message.includes("not found")
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;

      return res.status(status).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  // Public endpoint: get ONLY donation status - NO GUARDS
  @Get("meezan/status-only")
  async getMeezanDonationStatusOnly(
    @Query("donationId") donationId: string,
    @Res() res: Response,
  ) {
    try {
      const id = Number(donationId);
      if (!donationId || Number.isNaN(id)) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: "donationId is required and must be a number",
        });
      }

      const result = await this.donationsService.getDonationStatusOnly(id);
      return res.status(HttpStatus.OK).json({
        success: true,
        data: result,
      });
    } catch (error) {
      const status = error.message.includes("not found")
        ? HttpStatus.NOT_FOUND
        : HttpStatus.BAD_REQUEST;

      return res.status(status).json({
        success: false,
        message: error.message,
        data: null,
      });
    }
  }

  // Meezan returnUrl handler (browser redirect) - NO GUARDS
  // Meezan redirects the user's browser here after payment attempt.
  // We get current status (no Meezan verification) and redirect user to frontend with status param.
  @Get("meezan/return")
  async handleMeezanReturn(
    @Query("donationId") donationId: string,
    @Query() query: any,
    @Res() res: Response,
  ) {
    try {
      const id = Number(donationId);
      if (!donationId || Number.isNaN(id)) {
        return res.status(HttpStatus.BAD_REQUEST).send("Invalid donationId");
      }

      // Get current donation status (no Meezan verification)
      const donation = await this.donationsService.getDonationForRedirect(id);
      const status = donation.status || "pending";

      const frontendBase =
        process.env.BASE_Frontend_URL || "https://donation.mtjfoundation.org";

      // Redirect paths per your spec
      const successPath = "/thank-you";
      const failedPath = "/payment-failed";
      const pendingPath = "/pending";

      let redirectPath = pendingPath;
      let statusParam = "pending";

      if (status === "completed") {
        redirectPath = successPath;
        statusParam = "success";
      } else if (
        status === "failed" ||
        status === "cancelled" ||
        status === "refunded"
      ) {
        redirectPath = failedPath;
        statusParam = "failed";
      } else {
        redirectPath = pendingPath;
        statusParam = "pending";
      }

      const redirectUrl = `${frontendBase}${redirectPath}?donationId=${id}&status=${statusParam}`;
      return res.redirect(302, redirectUrl);
    } catch (error) {
      console.error("Meezan return handler error:", error.message);
      const frontendBase =
        process.env.BASE_Frontend_URL || "https://donation.mtjfoundation.org";
      const redirectUrl = `${frontendBase}/pending?donationId=${donationId || ""}&status=pending`;
      return res.redirect(302, redirectUrl);
    }
  }

  // Public Meezan uptime status endpoint - NO GUARDS
  // Tests Meezan API connectivity by creating a test invoice
  @Get("meezan/status")
  async getMeezanStatus(@Res() res: Response) {
    try {
      // Use dummy data for uptime check (don't store in database)
      const testOrderNumber = 20; // Dummy ID as specified
      const testAmount = 100; // Dummy amount as specified

      // Test: Create test invoice on Meezan (no savedDonation provided, so uses dummy values)
      const meezanResult = await this.donationsService.createMeezanInvoice(
        testOrderNumber,
        testAmount,
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        status: "active",
        message: "Meezan API is operational",
        details: {
          invoiceCreated: true,
          testOrderNumber: testOrderNumber,
          testAmount: testAmount,
          paymentUrl: meezanResult.paymentUrl ? "Generated" : "Not available",
          orderId: meezanResult.orderId,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error) {
      console.error("Meezan status check error:", error.message);

      return res.status(HttpStatus.SERVICE_UNAVAILABLE).json({
        success: false,
        status: "unavailable",
        message: "Meezan API is not available",
        error: error.message,
        details: {
          invoiceCreated: false,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }
}
