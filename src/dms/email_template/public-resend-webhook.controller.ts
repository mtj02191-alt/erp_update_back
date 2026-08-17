import {
  Controller,
  Headers,
  HttpStatus,
  Logger,
  Post,
  Req,
  Res,
} from "@nestjs/common";
import { Request, Response } from "express";
import { EmailService } from "../../email/email.service";
import { EmailTemplateService } from "./email_template.service";

/**
 * Public Resend webhooks — no JWT.
 * Configure in Resend dashboard:
 *   URL: https://<api-host>/email/public/resend/webhook
 *   Events: email.delivered, email.opened, email.clicked, email.bounced, email.complained
 *   Env: RESEND_WEBHOOK_SECRET=whsec_...
 */
@Controller("email/public")
export class PublicResendWebhookController {
  private readonly logger = new Logger(PublicResendWebhookController.name);

  constructor(
    private readonly emailService: EmailService,
    private readonly emailTemplateService: EmailTemplateService,
  ) {}

  @Post("resend/webhook")
  async handleResendWebhook(
    @Req() req: Request,
    @Res() res: Response,
    @Headers("svix-id") svixId?: string,
    @Headers("svix-timestamp") svixTimestamp?: string,
    @Headers("svix-signature") svixSignature?: string,
  ) {
    try {
      const rawBody = req.body as Buffer | string;
      if (!rawBody || !svixId || !svixTimestamp || !svixSignature) {
        return res.status(HttpStatus.BAD_REQUEST).json({
          success: false,
          message: "Missing raw body or svix signature headers",
        });
      }

      const event = this.emailService.verifyResendWebhook(rawBody, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      });

      const result =
        await this.emailTemplateService.handleResendWebhookEvent(event);

      this.logger.log(
        `Resend webhook ${event?.type || "unknown"} email_id=${event?.data?.email_id || "-"} matched=${result.matched}${result.log_id ? ` log=${result.log_id}` : ""}`,
      );

      return res.status(HttpStatus.OK).json({
        success: true,
        matched: result.matched,
        log_id: result.log_id ?? null,
        status: result.status ?? null,
      });
    } catch (error: any) {
      this.logger.error(
        `Resend webhook error: ${error?.message || error}`,
      );
      return res.status(HttpStatus.BAD_REQUEST).json({
        success: false,
        message: error?.message || "Invalid webhook",
      });
    }
  }
}
