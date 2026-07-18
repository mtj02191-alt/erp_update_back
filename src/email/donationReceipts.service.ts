import { Injectable, Logger } from "@nestjs/common";
import { EmailService } from "./email.service";
import donationReceiptInKindEmailTemplate from "./donationReceiptInKindEmailTemplate";
import horizontalDonationReceiptEmailTemplate from "./horizontalDonationReceiptEmailTemplate";

@Injectable()
export class DonationReceiptsService {
  private readonly logger = new Logger(DonationReceiptsService.name);

  constructor(private readonly emailService: EmailService) {}

  /**
   * Send a basic in-kind donation receipt email.
   * Uses the HTML template from `donationReceiptInKindEmailTemplate.js`.
   */
  async sendDonationInKindReceipt(params: {
    donorEmail: string;
    donorName?: string;
    donationId: number;
    amount?: number;
    currency?: string;
    logoUrl?: string;
    // Pass-through data for the receipt template.
    data?: any;
    // Products shown in the receipt.
    products?: Array<{
      name?: string;
      qty?: number;
      amount?: number;
    }>;
  }): Promise<boolean> {
    const {
      donorEmail,
      donorName,
      donationId,
      amount,
      currency,
      logoUrl,
      data,
      products,
    } = params;

    if (!donorEmail) return false;

    const subject = `Donation In-Kind Receipt - Donation #${donationId}`;
    const amountLine =
      amount != null
        ? `Amount: ${amount} ${currency || "PKR"}`
        : "Amount: (not specified)";

    const receiptData = {
      ...data,
      receiptNo: data?.receiptNo ?? donationId,
      donorName: data?.donorName ?? donorName,
    };

    const html = donationReceiptInKindEmailTemplate({
      logoUrl: logoUrl || "",
      data: receiptData,
      products: products || [],
    });

    const text = `In-Kind Donation Receipt\nDonation ID: ${donationId}\n${amountLine}`;

    this.logger.log(
      `Sending in-kind receipt for donation #${donationId} to ${donorEmail}`,
    );

    const sent = await this.emailService.sendReportEmail({
      to: donorEmail,
      subject,
      html,
      text,
    });
    this.logger.log(
      `Donation in-kind receipt sendReportEmail result for donation #${donationId}: ${sent}`,
    );
    return sent;
  }

  /**
   * Send a horizontal donation receipt email (cash donation receipt).
   * Uses `horizontalDonationReceiptEmailTemplate` for the HTML body.
   */
  async sendHorizontalDonationReceiptEmail(params: {
    donorEmail: string;
    logoUrl?: string;
    title?: string;
    accreditationLines?: string[];
    offices?: any[];
    donor?: any;
    receipt?: any;
    donationId?: number | string;
  }): Promise<boolean> {
    const {
      donorEmail,
      logoUrl,
      title,
      accreditationLines,
      offices,
      donor,
      receipt,
      donationId,
    } = params;

    if (!donorEmail) return false;

    const receiptNo = receipt?.receiptNo ?? donationId ?? "-";

    const html = horizontalDonationReceiptEmailTemplate({
      logoUrl: logoUrl || "",
      title,
      accreditationLines,
      offices,
      donor: {
        ...(donor || {}),
        email: donor?.email ?? donorEmail,
      },
      receipt: {
        ...(receipt || {}),
        receiptNo,
      },
    });

    const subject = `Donation Receipt - ${receiptNo}`;
    const amountLine =
      receipt?.amount != null
        ? `Amount: ${receipt.amount} ${receipt.currency || "PKR"}`
        : "Amount: (not specified)";

    const text = `Donation Receipt\nReceipt #: ${receiptNo}\n${amountLine}`;

    this.logger.log(
      `Sending horizontal donation receipt for receipt #${receiptNo} to ${donorEmail}`,
    );

    const sent = await this.emailService.sendReportEmail({
      to: donorEmail,
      subject,
      html,
      text,
    });

    this.logger.log(
      `Horizontal donation receipt sendReportEmail result for receipt #${receiptNo}: ${sent}`,
    );

    return sent;
  }
}

// Backward-compat alias for the misspelling requested by the user.
export { DonationReceiptsService as DonationReciptsService };
