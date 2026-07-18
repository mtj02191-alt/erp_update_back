import {
  Controller,
  Post,
  Param,
  HttpStatus,
  HttpException,
  Logger,
  Res,
  Query,
} from "@nestjs/common";
import { Response } from "express";
import { DonationsService } from "../../donations/donations.service";
import { EmailService } from "../../email/email.service";
import { WhatsAppService } from "../services/whatsapp.service";

@Controller("communication")
export class CommunicationController {
  private readonly logger = new Logger(CommunicationController.name);

  constructor(
    private readonly donationsService: DonationsService,
    private readonly emailService: EmailService,
    private readonly whatsAppService: WhatsAppService,
  ) {}

  /**
   * Send donation thanks message/email (Payment Confirmation)
   * This endpoint sends a thank you message to the donor after successful payment
   *
   * @param donationId - The ID of the donation
   * @returns Success response with email and WhatsApp sending status
   */
  @Post("donation/:id/thanks")
  async sendDonationThanks(
    @Param("id") donationId: string,
    @Res() res: Response,
    @Query("emailOnly") emailOnly?: string,
    @Query("whatsappOnly") whatsappOnly?: string,
  ) {
    try {
      const id = parseInt(donationId);
      if (isNaN(id)) {
        throw new HttpException("Invalid donation ID", HttpStatus.BAD_REQUEST);
      }

      // Fetch donation with donor relation
      const donation = await this.donationsService.findOne(id);

      if (!donation) {
        throw new HttpException(
          `Donation with ID ${id} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      // Extract donor information
      const donor = donation.donor;
      if (!donor) {
        throw new HttpException(
          `Donor information not found for donation ${id}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const donorName =
        donor.name || donor.first_name || donor.company_name || "Valued Donor";
      const donorEmail = donor.email;
      const donorPhone = donor.phone;
      const amount = donation.amount || donation.paid_amount || 0;
      const currency = donation.currency || "PKR";
      const donationType = donation.donation_type || "general";
      const orderId = donation.orderId;

      // Prepare results
      const results = {
        email: { sent: false, error: null },
        whatsapp: { sent: false, error: null },
      };

      const shouldSendEmail =
        (emailOnly !== "true" && whatsappOnly !== "true") ||
        emailOnly === "true";
      const shouldSendWhatsApp =
        (emailOnly !== "true" && whatsappOnly !== "true") ||
        whatsappOnly === "true";

      // Send Email - Thank you email after successful payment
      if (shouldSendEmail) {
        if (donorEmail) {
          try {
            const emailSent = await this.emailService.sendDonationSuccessEmail(
              donation,
              donor,
              donorEmail, // Send to donor for thanks message
            );

            results.email.sent = emailSent;
          } catch (error: any) {
            this.logger.error(
              `Failed to send thank you email: ${error.message}`,
            );
            results.email.error = error.message;
          }
        } else {
          results.email.error = "Donor email not found";
        }
      }

      // Send WhatsApp - Payment confirmation (Thank you message)
      if (shouldSendWhatsApp) {
        if (donorPhone) {
          try {
            const whatsappSent =
              await this.whatsAppService.sendPaymentConfirmation({
                phoneNumber: donorPhone,
                userName: donorName,
                amount: amount.toString(),
              });

            results.whatsapp.sent = whatsappSent;
          } catch (error: any) {
            this.logger.error(
              `Failed to send thank you WhatsApp: ${error.message}`,
            );
            results.whatsapp.error = error.message;
          }
        } else {
          results.whatsapp.error = "Donor phone number not found";
        }
      }

      // Update donation flags if messages sent successfully
      if (results.email.sent || results.whatsapp.sent) {
        try {
          // You might want to update donation.message_sent and email_sent flags here
          // This would require injecting the donation repository or adding a method to DonationsService
        } catch (updateError) {
          this.logger.warn(
            `Failed to update donation flags: ${updateError.message}`,
          );
        }
      }

      const success = results.email.sent || results.whatsapp.sent;

      return res
        .status(success ? HttpStatus.OK : HttpStatus.PARTIAL_CONTENT)
        .json({
          success,
          message: success
            ? "Thank you messages sent successfully"
            : "Some messages failed to send",
          data: {
            donationId: id,
            donorName,
            donorEmail,
            donorPhone,
            results,
          },
        });
    } catch (error: any) {
      this.logger.error(`Error sending donation thanks: ${error.message}`);

      const status =
        error instanceof HttpException
          ? error.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;

      return res.status(status).json({
        success: false,
        message: error.message || "Failed to send thank you messages",
        data: null,
      });
    }
  }

  /**
   * Send donation link message/email (Abandoned Cart / Payment Reminder)
   * This endpoint sends a payment link to the donor for pending donations
   *
   * @param donationId - The ID of the donation
   * @returns Success response with email and WhatsApp sending status
   */
  @Post("donation/:id/link")
  async sendDonationLink(
    @Param("id") donationId: string,
    @Res() res: Response,
    @Query("emailOnly") emailOnly?: string,
    @Query("whatsappOnly") whatsappOnly?: string,
  ) {
    try {
      const id = parseInt(donationId);
      if (isNaN(id)) {
        throw new HttpException("Invalid donation ID", HttpStatus.BAD_REQUEST);
      }

      // Fetch donation with donor relation
      const donation = await this.donationsService.findOne(id);

      if (!donation) {
        throw new HttpException(
          `Donation with ID ${id} not found`,
          HttpStatus.NOT_FOUND,
        );
      }

      // Extract donor information
      const donor = donation.donor;
      if (!donor) {
        throw new HttpException(
          `Donor information not found for donation ${id}`,
          HttpStatus.BAD_REQUEST,
        );
      }

      const donorName =
        donor.name || donor.first_name || donor.company_name || "Valued Donor";
      const donorEmail = donor.email;
      const donorPhone = donor.phone;
      const amount = donation.amount || donation.paid_amount || 0;
      const currency = donation.currency || "PKR";
      const donationType = donation.donation_type || "general";

      // Generate payment URL
      const baseUrl =
        process.env.BASE_Frontend_URL || "https://mtjfoundation.org";
      const paymentUrl = `${baseUrl}/checkout?donationId=${id}`;

      // Prepare results
      const results = {
        email: { sent: false, error: null },
        whatsapp: { sent: false, error: null },
      };

      const shouldSendEmail =
        (emailOnly !== "true" && whatsappOnly !== "true") ||
        emailOnly === "true";
      const shouldSendWhatsApp =
        (emailOnly !== "true" && whatsappOnly !== "true") ||
        whatsappOnly === "true";

      // Send Email - Donation confirmation with payment link
      if (shouldSendEmail) {
        if (donorEmail) {
          try {
            // send Failure Email here
            const emailSent =
              await this.emailService.sendDonationFailureEmail(donation);

            results.email.sent = emailSent;
          } catch (error: any) {
            this.logger.error(
              `Failed to send donation link email: ${error.message}`,
            );
            results.email.error = error.message;
          }
        } else {
          results.email.error = "Donor email not found";
        }
      }

      // Send WhatsApp - Abandoned cart payment reminder with donation link
      if (shouldSendWhatsApp) {
        if (donorPhone) {
          try {
            const whatsappSent = await this.whatsAppService.sendAbandonMessage({
              phoneNumber: donorPhone,
              userName: donorName,
              amount: amount.toString(),
              donationId: id,
            });

            results.whatsapp.sent = whatsappSent;
          } catch (error: any) {
            this.logger.error(
              `Failed to send donation link WhatsApp: ${error.message}`,
            );
            results.whatsapp.error = error.message;
          }
        } else {
          results.whatsapp.error = "Donor phone number not found";
        }
      }

      // Update donation flags if messages sent successfully
      if (results.email.sent || results.whatsapp.sent) {
        try {
          // You might want to update donation.message_sent and email_sent flags here
          // This would require injecting the donation repository or adding a method to DonationsService
        } catch (updateError) {
          this.logger.warn(
            `Failed to update donation flags: ${updateError.message}`,
          );
        }
      }

      const success = results.email.sent || results.whatsapp.sent;

      return res
        .status(success ? HttpStatus.OK : HttpStatus.PARTIAL_CONTENT)
        .json({
          success,
          message: success
            ? "Donation link messages sent successfully"
            : "Some messages failed to send",
          data: {
            donationId: id,
            donorName,
            donorEmail,
            donorPhone,
            paymentUrl,
            results,
          },
        });
    } catch (error: any) {
      this.logger.error(`Error sending donation link: ${error.message}`);

      const status =
        error instanceof HttpException
          ? error.getStatus()
          : HttpStatus.INTERNAL_SERVER_ERROR;

      return res.status(status).json({
        success: false,
        message: error.message || "Failed to send donation link messages",
        data: null,
      });
    }
  }
}
