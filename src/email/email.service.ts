import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { Resend } from "resend";
import { ConfigService } from "@nestjs/config";
import { generateTaskOverdueTemplate } from "./taskOverdueEmailTemplate";

@Injectable()
export class EmailService implements OnModuleInit {
  private readonly logger = new Logger(EmailService.name);
  private resend?: Resend;

  constructor(private configService: ConfigService) {
    this.initializeResend();
    this.validateConfiguration();
  }

  private initializeResend() {
    const apiKey = this.configService.get<string>("RESEND_API_KEY", "");

    if (!apiKey) {
      this.logger.warn(
        "RESEND_API_KEY not configured - email service will not work",
      );
    } else {
      this.resend = new Resend(apiKey);
      this.logger.log("Resend client initialized successfully");
    }
  }

  async onModuleInit() {
    // Resend doesn't need connection verification like SMTP
    // API key validation happens on first send
    const apiKey = this.configService.get<string>("RESEND_API_KEY", "");

    if (!apiKey) {
      this.logger.warn("RESEND_API_KEY not set - email service will not work");
      this.logger.warn("Set RESEND_API_KEY in environment variables");
    } else {
      this.logger.log("Resend email service ready");
    }
  }

  private validateConfiguration() {
    const resendApiKey = this.configService.get<string>("RESEND_API_KEY", "");

    if (resendApiKey) {
      this.logger.log("Resend email service configured");
      const fromEmail = this.configService.get<string>("RESEND_FROM_EMAIL", "");
      if (!fromEmail) {
        this.logger.warn("RESEND_FROM_EMAIL not configured");
        this.logger.warn(
          "Make sure the from email domain is verified in Resend dashboard",
        );
      }
    } else {
      this.logger.error(
        "No email service configured - RESEND_API_KEY not found",
      );
      this.logger.warn("Get Resend API key from https://resend.com/api-keys");
    }

    this.logger.log("Email service configuration validated");
  }

  /**
   * Send a dynamic email using a template string and data for placeholders.
   * Placeholders should be in the format {{variable_name}}.
   */
  async sendDynamicEmail(params: {
    to: string;
    subject: string;
    body: string;
    data: Record<string, any>;
  }): Promise<boolean> {
    try {
      if (!this.resend) {
        this.logger.error("Resend is not configured - cannot send email");
        return false;
      }

      const fromEmail = this.configService.get<string>(
        "RESEND_FROM_EMAIL",
        "info@mtjfoundation.com",
      );
      const senderName = this.configService.get<string>(
        "SENDER_NAME",
        "MTJ Foundation",
      );

      // Replace placeholders in subject and body
      const replacePlaceholders = (text: string, data: Record<string, any>) => {
        return text.replace(/{{(\w+)}}/g, (match, key) => {
          return data[key] !== undefined ? data[key] : match;
        });
      };

      const renderedSubject = replacePlaceholders(params.subject, params.data);
      const renderedBody = replacePlaceholders(params.body, params.data);

      const result = await this.resend.emails.send({
        from: `${senderName} <${fromEmail}>`,
        to: [params.to],
        subject: renderedSubject,
        html: renderedBody,
        headers: {
          "X-Mailer": "MTJ Foundation Dynamic Email System",
          "Reply-To": fromEmail,
        },
      });

      if (result.error !== null) {
        this.logger.warn(
          `Resend error sending dynamic email: ${JSON.stringify(result.error)}`,
        );
        return false;
      }

      this.logger.log(`Dynamic email sent successfully to ${params.to}`);
      return true;
    } catch (error: any) {
      this.logger.error(`Failed to send dynamic email: ${error.message}`);
      return false;
    }
  }

  private donationLabel(type?: string) {
    if (type === "zakat") return "Zakat";
    if (type === "sadqa" || type === "sadaqah") return "Sadqa";
    return "General";
  }

  async sendDonationConfirmation(d: {
    donorName: string;
    donorEmail: string;
    amount: number;
    currency: string;
    paymentUrl: string;
    donationMethod: string;
    donationType?: string;
    orderId?: string;
  }): Promise<boolean> {
    try {
      const fromEmail = this.configService.get<string>(
        "RESEND_FROM_EMAIL",
        "donations@mtjfoundation.com",
      );
      const senderName = this.configService.get<string>(
        "SENDER_NAME",
        "MTJ Foundation",
      );
      const typeLabel = this.donationLabel(d.donationType);

      if (!this.resend) {
        this.logger.error("Resend is not configured - cannot send email");
        return false;
      }

      const result = await this.resend.emails.send({
        from: `${senderName} <${fromEmail}>`,
        to: [d.donorEmail],
        subject: `${typeLabel} Donation Confirmation - ${d.orderId || "Pending"}`,
        html: this.generateDonationConfirmationTemplate({
          ...d,
          donationType: typeLabel,
        }),
        text: this.generateDonationConfirmationText({
          ...d,
          donationType: typeLabel,
        }),
        headers: {
          "X-Mailer": "MTJ Foundation Donation System",
          "List-Unsubscribe": `<mailto:unsubscribe@${fromEmail.split("@")[1]}>`,
          "Reply-To": fromEmail,
        },
      });
      const messageId = result.error === null ? result.data.id : "unknown";

      this.logger.log(
        `Sent donation confirmation via Resend to ${d.donorEmail} (id: ${messageId})`,
      );

      if (result.error !== null) {
        this.logger.warn(`Resend error: ${JSON.stringify(result.error)}`);
      }
      return true;
    } catch (error: any) {
      this.logger.error(`Email send failed: ${error?.message}`);
      if (error?.response) {
        this.logger.error(
          `Resend API error: ${JSON.stringify(error.response)}`,
        );
      }
      return false;
    }
  }

  private generateDonationConfirmationTemplate(donationData: {
    donorName: string;
    donorEmail: string;
    amount: number;
    currency: string;
    paymentUrl: string;
    donationMethod: string;
    donationType?: string;
    orderId?: string;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Donation Confirmation</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #2c5aa0; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .donation-details { background-color: white; padding: 20px; margin: 20px 0; border-radius: 5px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #2c5aa0; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
        <div class="header">
          <h1>Donation Confirmation</h1>
        </div>
          
          <div class="content">
            <p>Dear ${donationData.donorName},</p>
            
            <p>We have received your donation request and appreciate your support for our cause.</p>
            
            <div class="donation-details">
              <h3>Donation Details</h3>
              <p><strong>Type:</strong> ${donationData.donationType}</p>
              <p><strong>Amount:</strong> ${donationData.currency} ${donationData.amount}</p>
              <p><strong>Payment Method:</strong> ${donationData.donationMethod.toUpperCase()}</p>
              ${donationData.orderId ? `<p><strong>Transaction ID:</strong> ${donationData.orderId}</p>` : ""}
              <p><strong>Status:</strong> Pending Payment</p>
            </div>
            
            <p>To complete your donation, please click the secure payment link below:</p>
            <a href="${donationData.paymentUrl}" class="button">Proceed to Payment</a>
            
            <p>If the button doesn't work, you can copy and paste this link into your browser:</p>
            <p style="word-break: break-all; color: #2c5aa0;">${donationData.paymentUrl}</p>
            
            <p>If you have any questions or need assistance, please don't hesitate to contact us.</p>
            
            <p>Thank you again for your support!</p>
          </div>
          
          <div class="footer">
            <p>This is an automated message. Please do not reply to this email.</p>
            <p>&copy; ${new Date().getFullYear()} MTJ Foundation. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateDonationConfirmationText(donationData: {
    donorName: string;
    donorEmail: string;
    amount: number;
    currency: string;
    paymentUrl: string;
    donationMethod: string;
    donationType?: string;
    orderId?: string;
  }): string {
    return `
      Thank You for Your Donation!
      
      Dear ${donationData.donorName},
      
      Thank you for your generous donation. We truly appreciate your support for our cause.
      
      Donation Details:
      - Type: ${donationData.donationType}
      - Amount: ${donationData.currency} ${donationData.amount}
      - Payment Method: ${donationData.donationMethod.toUpperCase()}
      ${donationData.orderId ? `- Transaction ID: ${donationData.orderId}` : ""}
      - Status: Pending Payment
      
      To complete your donation, please visit: ${donationData.paymentUrl}
      
      If you have any questions or need assistance, please don't hesitate to contact us.
      
      Thank you again for your support!
      
      ---
      This is an automated message. Please do not reply to this email.
      © ${new Date().getFullYear()} MTJ Foundation. All rights reserved.
    `;
  }

  // Send donation success notification (defaults to admin, can send to donor if recipientEmail provided)
  async sendDonationSuccessEmail(
    donation: any,
    donor: any,
    recipientEmail?: string,
  ): Promise<boolean> {
    try {
      const defaultEmail = "dev@mtjfoundation.org";
      const toEmail = recipientEmail || defaultEmail;
      const fromEmail = this.configService.get<string>(
        "RESEND_FROM_EMAIL",
        "info@mtjfoundation.com",
      );
      const senderName = this.configService.get<string>(
        "SENDER_NAME",
        "MTJ Foundation",
      );

      if (!this.resend) {
        this.logger.error("Resend is not configured - cannot send email");
        return false;
      }

      // Use different subject for donor vs admin
      const isDonorEmail = recipientEmail && recipientEmail !== defaultEmail;
      const subject = isDonorEmail
        ? `❤️ Thank You for Your Generous Donation - ${donation.amount} ${donation.currency || "PKR"}`
        : `✅ Donation Success - ${donation.donor_name || donor?.name || "Anonymous"} - ${donation.amount} ${donation.currency || "PKR"}`;

      const result = await this.resend.emails.send({
        from: `${senderName} <${fromEmail}>`,
        to: [toEmail],
        subject,
        html: this.generateDonationSuccessTemplate(donation, donor),
        // text: this.generateDonationSuccessText(donation),
        headers: {
          "X-Mailer": "MTJ Foundation Donation System",
          "Reply-To": fromEmail,
        },
      });
      const messageId = result.data?.id || "unknown";
      this.logger.log(
        `Sent donation success notification via Resend to ${toEmail} (id: ${messageId})`,
      );
      if (!result.data?.id) {
        this.logger.warn(
          `Resend response missing message ID. Full response: ${JSON.stringify(result)}`,
        );
      }
      return true;
    } catch (error: any) {
      this.logger.error(
        `Donation success email send failed: ${error?.message}`,
      );
      return false;
    }
  }

  // Send donation failure notification to admin
  async sendDonationFailureEmail(donation: any): Promise<boolean> {
    try {
      const staticEmailAddress = "dev@mtjfoundation.org";
      const fromEmail = this.configService.get<string>(
        "RESEND_FROM_EMAIL",
        "info@mtjfoundation.com",
      );
      const senderName = this.configService.get<string>(
        "SENDER_NAME",
        "MTJ Foundation",
      );

      if (!this.resend) {
        this.logger.error("Resend is not configured - cannot send email");
        return false;
      }

      const result = await this.resend.emails.send({
        from: `${senderName} <${fromEmail}>`,
        to: [donation?.donor?.email || staticEmailAddress],
        subject: `⚠️ Incomplete Donation - ${donation?.donor?.name || "Anonymous"} - ${donation.amount} ${donation.currency || "PKR"}`,
        html: this.generateDonationFailureTemplate(donation),
        // text: this.generateDonationFailureText(donation, errorDetails),
        headers: {
          "X-Mailer": "MTJ Foundation Donation System",
          "Reply-To": fromEmail,
        },
      });
      const messageId = result.data?.id || "unknown";
      this.logger.log(
        `Sent donation failure notification via Resend to ${staticEmailAddress} (id: ${messageId})`,
      );
      if (!result.data?.id) {
        this.logger.warn(
          `Resend response missing message ID. Full response: ${JSON.stringify(result)}`,
        );
      }
      return true;
    } catch (error: any) {
      this.logger.error(
        `Donation failure email send failed: ${error?.message}`,
      );
      return false;
    }
  }

  private generateDonationSuccessTemplate(donation: any, donor: any): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Donation Success Notification</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #30AEE3;  color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .donation-details { background-color: white; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #28a745; }
          .message-box { background-color: #ffffff; padding: 20px; margin-top: 20px; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>❤️ Thank You for Your Generosity</h1>
          </div>
          
          <div class="content">
  
            <p>
              Dear <strong>${donor.name || "Valued Supporter"}</strong>,
            </p>
  
            <p>
              We are deeply grateful for your generous contribution. Your donation is more than a financial gift — 
              it is an act of compassion, kindness, and hope.
            </p>
  
            <p>
              Because of you, lives will be touched, dignity will be restored, and families in need will receive
              support during their most difficult times. Your trust empowers us to continue our mission of serving
              humanity with transparency and responsibility.
            </p>
  
            <div class="donation-details">
              <h3>Donation Details</h3>
              <p><strong>Donation ID:</strong> ${donation.id}</p>
              <p><strong>Donor Name:</strong> ${donor.name || "Anonymous"}</p>
              <p><strong>Donor Email:</strong> ${donor.email || "N/A"}</p>
              <p><strong>Amount:</strong> ${donation.amount} ${donation.currency || "PKR"}</p>
              <p><strong>Payment Date:</strong> ${donation?.date}</p>
              <p>
                <strong>Status:</strong>
                <span style="color: #30AEE3; font-weight: bold;">Completed</span>
              </p>
            </div>
  
            <div class="message-box">
              <p>
                Your support helps us deliver food, healthcare, education, and relief to those who need it most.
                Every contribution, big or small, creates a meaningful impact and brings us one step closer to a
                more compassionate and just society.
              </p>
  
              <p>
                May your generosity return to you in the form of peace, prosperity, and countless blessings.
              </p>
            </div>
  
          </div>
          
          <div class="footer">
            <p>
              If you have any questions or need further information, feel free to contact us at any time.
            </p>
            <p>
              &copy; ${new Date().getFullYear()} MTJ Foundation. All rights reserved.
            </p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateDonationSuccessText(donation: any): string {
    return `
      🎉 Donation Successfully Processed
      
      Donation Details:
      - Donation ID: ${donation.id}
      - Donor Name: ${donation.donor_name || "Anonymous"}
      - Donor Email: ${donation.donor_email || "N/A"}
      - Amount: ${donation.amount} ${donation.currency || "PKR"}
      - Payment Date: ${donation?.date}
      - Status: Completed
      
      © ${new Date().getFullYear()} MTJ Foundation. All rights reserved.
    `;
  }

  private generateDonationFailureTemplate(donation: any): string {
    const donationURl = `https://mtjfoundation.org/checkout?donationId=${donation?.id}`;
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Donation Could Not Be Completed</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #dc3545; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background-color: #f9f9f9; }
          .donation-details { background-color: white; padding: 20px; margin: 20px 0; border-radius: 5px; border-left: 4px solid #dc3545; }
          .message-box { background-color: #ffffff; padding: 20px; margin-top: 20px; border-radius: 5px; }
          .btn-wrap { text-align: center; margin: 20px 0; }
          .btn {
            display: inline-block;
            padding: 12px 18px;
            background-color: #28a745;
            color: #ffffff !important;
            text-decoration: none;
            border-radius: 6px;
            font-weight: bold;
          }
          .muted { font-size: 12px; color: #666; }
          .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          code { background: #f1f1f1; padding: 2px 6px; border-radius: 4px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Donation Could Not Be Completed</h1>
          </div>
  
          <div class="content">
  
            <p>
              Dear <strong>${donation.donor_name || "Valued Supporter"}</strong>,
            </p>
  
            <div class="message-box">
              <p>
                Thank you for your intention to support our mission. Unfortunately, your donation
                could not be completed due to a temporary technical issue.
              </p>
              <p>
                Please don’t worry — <strong>no successful donation was recorded for this attempt</strong>.
                You may safely try again using the button below.
              </p>
            </div>
  
            <div class="donation-details">
              <h3>Donation Summary</h3>
              <p><strong>Donation ID:</strong> ${donation.id}</p>
              <p><strong>Amount:</strong> ${donation.amount} ${donation.currency || "PKR"}</p>
              <p>
                <strong>Status:</strong>
                <span style="color: #dc3545; font-weight: bold;">Not Completed</span>
              </p>
            </div>
  
            <div class="btn-wrap">
              <a class="btn" href=${donationURl} target="_blank" rel="noopener noreferrer">
                ✅ Complete Donation
              </a>
            </div>
  
            <p class="muted">
              If the button doesn’t work, copy and paste this link into your browser:<br/>
              <code>${donationURl}</code>
            </p>
  
            <p class="muted">
              If you believe your account was charged or you need assistance, please reply to this
              email and our support team will be happy to help you.
            </p>
  
            <p class="muted"><em>This is an automated notification from MTJ Foundation.</em></p>
          </div>
  
          <div class="footer">
            <p>&copy; ${new Date().getFullYear()} MTJ Foundation. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateDonationFailureText(
    donation: any,
    errorDetails: any,
  ): string {
    return `
      ⚠️ Donation Processing Failed
      
      Donation Details:
      - Donation ID: ${donation.id}
      - Donor Name: ${donation.donor_name || "Anonymous"}
      - Donor Email: ${donation.donor_email || "N/A"}
      - Amount: ${donation.amount} ${donation.currency || "PKR"}
      - Error Code: ${errorDetails.err_code}
      - Error Message: ${errorDetails.err_msg || "Unknown error"}
      - Transaction ID: ${errorDetails.transaction_id || "N/A"}
      - Status: Failed
      
      This is an automated notification from your donation system.
      
      © ${new Date().getFullYear()} MTJ Foundation. All rights reserved.
    `;
  }

  // ============================================
  // JOB APPLICATION EMAIL METHODS
  // ============================================

  /**
   * Send job application confirmation email to applicant
   */
  async sendJobApplicationConfirmation(data: {
    applicantName: string;
    applicantEmail: string;
    jobTitle: string;
    applicationId: number;
  }): Promise<boolean> {
    try {
      const fromEmail = this.configService.get<string>(
        "RESEND_FROM_EMAIL",
        "careers@mtjfoundation.com",
      );
      const senderName = this.configService.get<string>(
        "SENDER_NAME",
        "MTJ Foundation",
      );

      if (!this.resend) {
        this.logger.error("Resend is not configured - cannot send email");
        return false;
      }

      const result = await this.resend.emails.send({
        from: `${senderName} <${fromEmail}>`,
        to: [data.applicantEmail],
        subject: `Application Received - ${data.jobTitle}`,
        html: this.generateJobApplicationConfirmationTemplate(data),
        text: this.generateJobApplicationConfirmationText(data),
        headers: {
          "X-Mailer": "MTJ Foundation Career Portal",
          "Reply-To": fromEmail,
        },
      });
      const messageId = result.data?.id || "unknown";
      this.logger.log(
        `Sent job application confirmation via Resend to ${data.applicantEmail} (id: ${messageId})`,
      );
      if (!result.data?.id) {
        this.logger.warn(
          `Resend response missing message ID. Full response: ${JSON.stringify(result)}`,
        );
      }
      return true;
    } catch (error: any) {
      this.logger.error(
        `Job application confirmation email send failed: ${error?.message}`,
      );
      return false;
    }
  }

  /**
   * Send new job application notification to admin
   */
  async sendNewJobApplicationNotification(data: {
    applicantName: string;
    applicantEmail: string;
    jobTitle: string;
    applicationId: number;
  }): Promise<boolean> {
    try {
      const staticEmailAddress = "dev@mtjfoundation.org";
      const fromEmail = this.configService.get<string>(
        "RESEND_FROM_EMAIL",
        "careers@mtjfoundation.com",
      );
      const senderName = this.configService.get<string>(
        "SENDER_NAME",
        "MTJ Foundation",
      );

      if (!this.resend) {
        this.logger.error("Resend is not configured - cannot send email");
        return false;
      }

      const result = await this.resend.emails.send({
        from: `${senderName} <${fromEmail}>`,
        to: [staticEmailAddress],
        subject: `New Job Application - ${data.jobTitle}`,
        html: this.generateNewJobApplicationNotificationTemplate(data),
        text: this.generateNewJobApplicationNotificationText(data),
        headers: {
          "X-Mailer": "MTJ Foundation Career Portal",
          "Reply-To": fromEmail,
        },
      });
      const messageId = result.data?.id || "unknown";
      this.logger.log(
        `Sent new job application notification via Resend to ${staticEmailAddress} (id: ${messageId})`,
      );
      if (!result.data?.id) {
        this.logger.warn(
          `Resend response missing message ID. Full response: ${JSON.stringify(result)}`,
        );
      }
      return true;
    } catch (error: any) {
      this.logger.error(
        `New job application notification email send failed: ${error?.message}`,
      );
      return false;
    }
  }

  /**
   * Send job application status update email to applicant
   */
  async sendJobApplicationStatusUpdate(data: {
    applicantName: string;
    applicantEmail: string;
    jobTitle: string;
    oldStatus: string;
    newStatus: string;
  }): Promise<boolean> {
    try {
      const fromEmail = this.configService.get<string>(
        "RESEND_FROM_EMAIL",
        "careers@mtjfoundation.com",
      );
      const senderName = this.configService.get<string>(
        "SENDER_NAME",
        "MTJ Foundation",
      );

      if (!this.resend) {
        this.logger.error("Resend is not configured - cannot send email");
        return false;
      }

      const result = await this.resend.emails.send({
        from: `${senderName} <${fromEmail}>`,
        to: [data.applicantEmail],
        subject: `Application Update - ${data.jobTitle}`,
        html: this.generateJobApplicationStatusUpdateTemplate(data),
        text: this.generateJobApplicationStatusUpdateText(data),
        headers: {
          "X-Mailer": "MTJ Foundation Career Portal",
          "Reply-To": fromEmail,
        },
      });

      console.log("result 1234567", result);
      const messageId = result.data?.id || result?.data?.id || "unknown";
      this.logger.log(
        `Sent job application status update via Resend to ${data.applicantEmail} (id: ${messageId})`,
      );
      return true;
    } catch (error: any) {
      this.logger.error(
        `Job application status update email send failed: ${error?.message}`,
      );
      return false;
    }
  }

  private generateJobApplicationConfirmationTemplate(data: {
    applicantName: string;
    jobTitle: string;
    applicationId: number;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Application Received</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div class="container" style="background-color: #f9f9f9; padding: 30px; border-radius: 10px;">
          <div class="header" style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2c3e50;">Application Received</h1>
          </div>
          
          <div class="content" style="background-color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <p>Dear ${data.applicantName},</p>
            
            <p>Thank you for your interest in joining the MTJ Foundation team!</p>
            
            <p>We have successfully received your application for the position of <strong>${data.jobTitle}</strong>.</p>
            
            <div style="background-color: #e8f5e9; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Application ID:</strong> ${data.applicationId}</p>
              <p style="margin: 5px 0 0 0;"><strong>Status:</strong> Pending Review</p>
            </div>
            
            <p>Our HR team will review your application and get back to you soon. We appreciate your patience during this process.</p>
            
            <p>If you have any questions, please feel free to contact us.</p>
            
            <p>Best regards,<br>MTJ Foundation HR Team</p>
          </div>
          
          <div class="footer" style="text-align: center; color: #666; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} MTJ Foundation. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateJobApplicationConfirmationText(data: {
    applicantName: string;
    jobTitle: string;
    applicationId: number;
  }): string {
    return `
      Application Received

      Dear ${data.applicantName},

      Thank you for your interest in joining the MTJ Foundation team!

      We have successfully received your application for the position of ${data.jobTitle}.

      Application ID: ${data.applicationId}
      Status: Pending Review

      Our HR team will review your application and get back to you soon. We appreciate your patience during this process.

      If you have any questions, please feel free to contact us.

      Best regards,
      MTJ Foundation HR Team

      © ${new Date().getFullYear()} MTJ Foundation. All rights reserved.
    `;
  }

  private generateNewJobApplicationNotificationTemplate(data: {
    applicantName: string;
    applicantEmail: string;
    jobTitle: string;
    applicationId: number;
  }): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Job Application</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div class="container" style="background-color: #f9f9f9; padding: 30px; border-radius: 10px;">
          <div class="header" style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2c3e50;">New Job Application</h1>
          </div>
          
          <div class="content" style="background-color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <p>A new job application has been submitted:</p>
            
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Application ID:</strong> ${data.applicationId}</p>
              <p style="margin: 5px 0 0 0;"><strong>Applicant Name:</strong> ${data.applicantName}</p>
              <p style="margin: 5px 0 0 0;"><strong>Applicant Email:</strong> ${data.applicantEmail}</p>
              <p style="margin: 5px 0 0 0;"><strong>Job Title:</strong> ${data.jobTitle}</p>
              <p style="margin: 5px 0 0 0;"><strong>Status:</strong> Pending Review</p>
            </div>
            
            <p>Please review the application in the admin panel.</p>
          </div>
          
          <div class="footer" style="text-align: center; color: #666; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} MTJ Foundation. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateNewJobApplicationNotificationText(data: {
    applicantName: string;
    applicantEmail: string;
    jobTitle: string;
    applicationId: number;
  }): string {
    return `
      New Job Application

      A new job application has been submitted:

      Application ID: ${data.applicationId}
      Applicant Name: ${data.applicantName}
      Applicant Email: ${data.applicantEmail}
      Job Title: ${data.jobTitle}
      Status: Pending Review

      Please review the application in the admin panel.

      © ${new Date().getFullYear()} MTJ Foundation. All rights reserved.
    `;
  }

  private generateJobApplicationStatusUpdateTemplate(data: {
    applicantName: string;
    jobTitle: string;
    oldStatus: string;
    newStatus: string;
  }): string {
    const statusMessages: { [key: string]: string } = {
      reviewed: "Your application has been reviewed by our team.",
      shortlisted:
        "Congratulations! You have been shortlisted for this position.",
      rejected:
        "Thank you for your interest. Unfortunately, we are unable to proceed with your application at this time.",
      hired: "Congratulations! We are pleased to offer you this position.",
    };

    const message =
      statusMessages[data.newStatus] ||
      "Your application status has been updated.";

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Application Update</title>
      </head>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div class="container" style="background-color: #f9f9f9; padding: 30px; border-radius: 10px;">
          <div class="header" style="text-align: center; margin-bottom: 30px;">
            <h1 style="color: #2c3e50;">Application Update</h1>
          </div>
          
          <div class="content" style="background-color: white; padding: 20px; border-radius: 5px; margin-bottom: 20px;">
            <p>Dear ${data.applicantName},</p>
            
            <p>We are writing to update you on the status of your application for the position of <strong>${data.jobTitle}</strong>.</p>
            
            <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <p style="margin: 0;"><strong>Previous Status:</strong> ${data.oldStatus}</p>
              <p style="margin: 5px 0 0 0;"><strong>New Status:</strong> ${data.newStatus}</p>
            </div>
            
            <p>${message}</p>
            
            <p>If you have any questions, please feel free to contact us.</p>
            
            <p>Best regards,<br>MTJ Foundation HR Team</p>
          </div>
          
          <div class="footer" style="text-align: center; color: #666; font-size: 12px;">
            <p>&copy; ${new Date().getFullYear()} MTJ Foundation. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateJobApplicationStatusUpdateText(data: {
    applicantName: string;
    jobTitle: string;
    oldStatus: string;
    newStatus: string;
  }): string {
    const statusMessages: { [key: string]: string } = {
      reviewed: "Your application has been reviewed by our team.",
      shortlisted:
        "Congratulations! You have been shortlisted for this position.",
      rejected:
        "Thank you for your interest. Unfortunately, we are unable to proceed with your application at this time.",
      hired: "Congratulations! We are pleased to offer you this position.",
    };

    const message =
      statusMessages[data.newStatus] ||
      "Your application status has been updated.";

    return `
      Application Update

      Dear ${data.applicantName},

      We are writing to update you on the status of your application for the position of ${data.jobTitle}.

      Previous Status: ${data.oldStatus}
      New Status: ${data.newStatus}

      ${message}

      If you have any questions, please feel free to contact us.

      Best regards,
      MTJ Foundation HR Team

      © ${new Date().getFullYear()} MTJ Foundation. All rights reserved.
    `;
  }

  /**
   * Test email service connection - for debugging
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    if (!this.resend) {
      return {
        success: false,
        message: "Resend is not configured",
        details: {
          service: "Resend",
          apiKeyConfigured: false,
          fromEmail: this.configService.get<string>(
            "RESEND_FROM_EMAIL",
            "not configured",
          ),
        },
      };
    }

    // Resend doesn't have a connection test endpoint, but we can verify API key by checking if it's set
    const apiKey = this.configService.get<string>("RESEND_API_KEY", "");
    return {
      success: !!apiKey,
      message: apiKey
        ? "Resend API key configured"
        : "Resend API key not configured",
      details: {
        service: "Resend",
        apiKeyConfigured: !!apiKey,
        fromEmail: this.configService.get<string>(
          "RESEND_FROM_EMAIL",
          "not configured",
        ),
      },
    };
  }

  /**
   * Send test email - for debugging email configuration
   */
  async sendTestEmail(to: string = "dev@mtjfoundation.org"): Promise<{
    success: boolean;
    message: string;
    details?: any;
    error?: any;
    troubleshooting?: any;
    timestamp?: string;
  }> {
    try {
      const fromEmail = this.configService.get<string>(
        "RESEND_FROM_EMAIL",
        "mtjfoundation.org",
      );
      const senderName = this.configService.get<string>(
        "SENDER_NAME",
        "MTJ Foundation",
      );

      if (!this.resend) {
        return {
          success: false,
          message: "Resend is not configured - cannot send test email",
          error: {
            message: "RESEND_API_KEY not set",
          },
          troubleshooting: {
            service: "Resend",
            suggestion:
              "Set RESEND_API_KEY in environment variables. Get API key from https://resend.com/api-keys",
          },
          timestamp: new Date().toISOString(),
        };
      }

      const htmlContent = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Test Email</title>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background-color: #2c5aa0; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background-color: #f9f9f9; }
            .footer { text-align: center; padding: 20px; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Hello from MTJ Foundation!</h1>
            </div>
            <div class="content">
              <p>This is a test email from your MTJ ERP backend.</p>
              <p>If you received this email, your email configuration is working correctly!</p>
              <p><strong>Timestamp:</strong> ${new Date().toISOString()}</p>
              <p><strong>Server:</strong> Railway Production</p>
              <p><strong>Email Service:</strong> Resend</p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} MTJ Foundation. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `;

      const textContent = `
        Hello from MTJ ERP!
        
        This is a test email from your MTJ ERP backend.
        
        If you received this email, your email configuration is working correctly!
        
        Timestamp: ${new Date().toISOString()}
        Server: Railway Production
        Email Service: Resend
        
        © ${new Date().getFullYear()} MTJ Foundation. All rights reserved.
      `;

      const result = await this.resend.emails.send({
        from: `${senderName} <${fromEmail}>`,
        to: [to],
        subject: "Test Email - Hello from MTJ Foundation",
        html: htmlContent,
        text: textContent,
        headers: {
          "X-Mailer": "MTJ Foundation ERP Test",
          "Reply-To": fromEmail,
        },
      });
      console.log("result 1234567", result);
      this.logger.log(
        `Test email sent via Resend to ${to} (id: ${result.data?.id})`,
      );

      return {
        success: true,
        message: "Test email sent successfully via Resend",
        details: {
          to: to,
          messageId: result.data?.id,
          service: "Resend",
          timestamp: new Date().toISOString(),
        },
      };
    } catch (error: any) {
      this.logger.error(`Test email send failed: ${error?.message}`);
      if (error?.response) {
        this.logger.error(
          `Resend API error: ${JSON.stringify(error.response)}`,
        );
      }

      return {
        success: false,
        message:
          error?.message || "Resend API error. Check your RESEND_API_KEY.",
        error: {
          message: error?.message,
          code: error?.code,
          response: error?.response,
        },
        troubleshooting: {
          service: "Resend",
          suggestion:
            "Check RESEND_API_KEY configuration and ensure RESEND_FROM_EMAIL domain is verified in Resend dashboard",
        },
        timestamp: new Date().toISOString(),
      };
    }
  }

  /**
   * Send report email - generic method for sending any report
   * Supports single email (string) or multiple emails (string[])
   */
  async sendReportEmail(data: {
    to: string | string[];
    subject: string;
    html: string;
    text: string;
  }): Promise<boolean> {
    try {
      const fromEmail = this.configService.get<string>(
        "RESEND_FROM_EMAIL",
        "info@mtjfoundation.com",
      );
      const senderName = this.configService.get<string>(
        "SENDER_NAME",
        "MTJ Foundation",
      );

      if (!this.resend) {
        this.logger.error("Resend is not configured - cannot send email");
        return false;
      }

      // Normalize to array: if string, convert to array; if already array, use as-is
      let recipients: string[];

      // Handle case where data.to might be a stringified array
      if (typeof data.to === "string") {
        // Check if it's a JSON array string
        if (data.to.trim().startsWith("[") && data.to.trim().endsWith("]")) {
          try {
            recipients = JSON.parse(data.to);
          } catch {
            // If parsing fails, treat as single email
            recipients = [data.to];
          }
        } else {
          // Single email string
          recipients = [data.to];
        }
      } else if (Array.isArray(data.to)) {
        recipients = data.to;
      } else {
        this.logger.error(`Invalid email format: ${typeof data.to}`);
        return false;
      }

      // Filter out any empty or invalid emails and ensure they're strings
      const validRecipients = recipients
        .filter(
          (email) => email && typeof email === "string" && email.includes("@"),
        )
        .map((email) => email.trim());

      if (validRecipients.length === 0) {
        this.logger.error("No valid email recipients provided");
        return false;
      }

      // Ensure we're passing a proper array to Resend
      this.logger.log(
        `Resend sendReportEmail inputs: to=${validRecipients.join(", ")} | from=${fromEmail} | subject=${data.subject}`,
      );

      const result: any = await this.resend.emails.send({
        from: `${senderName} <${fromEmail}>`,
        to: [...validRecipients], // Create a new array to ensure it's a proper array
        subject: data.subject,
        html: data.html,
        text: data.text,
        headers: {
          "X-Mailer": "MTJ Foundation ERP System",
          "Reply-To": fromEmail,
        },
      });

      const messageId = result?.data?.id || "unknown";
      const recipientsList = validRecipients.join(", ");
      this.logger.log(
        `Resend sendReportEmail response: to=${recipientsList} | messageId=${messageId} | hasError=${result?.error != null}`,
      );
      this.logger.log(
        `Resend sendReportEmail response.data: ${JSON.stringify(result?.data || null)}`,
      );

      if (result.error !== null) {
        this.logger.warn(`Resend error: ${JSON.stringify(result.error)}`);
        return false;
      }

      if (!result.data?.id) {
        this.logger.warn(
          `Resend response missing message ID. Full response: ${JSON.stringify(result)}`,
        );
      }

      return true;
    } catch (error: any) {
      this.logger.error(`Report email send failed: ${error?.message}`);
      if (error?.response) {
        this.logger.error(
          `Resend API error: ${JSON.stringify(error.response)}`,
        );
      }
      return false;
    }
  }

  //  Tasks Section
  async sendTaskAssignmentEmail(
    user: any,
    task: any,
    master?: any,
  ): Promise<boolean> {
    try {
      const fromEmail = this.configService.get<string>(
        "RESEND_FROM_EMAIL",
        "info@mtjfoundation.com",
      );
      const senderName = this.configService.get<string>(
        "SENDER_NAME",
        "MTJ Foundation",
      );

      if (!this.resend) {
        this.logger.error("Resend is not configured - cannot send email");
        return false;
      }

      let recurrenceInfo = "";
      if (master && master.task_type === "recurring") {
        const rule = master.recurrence_rule;
        const endType = master.recurrence_end_type;
        const endDate = master.recurrence_end_date
          ? new Date(master.recurrence_end_date).toLocaleDateString()
          : "";
        const endOccurrences = master.recurrence_end_occurrences;
        const currentOccurrence = master.recurrence_created_count;

        let endMsg = "";
        if (endType === "on_date") {
          endMsg = `until ${endDate}`;
        } else if (endType === "after_occurrences") {
          endMsg = `for ${endOccurrences} total occurrences (This is #${currentOccurrence})`;
        } else {
          endMsg = `indefinitely`;
        }
        recurrenceInfo = `<p><strong>Note:</strong> This is a recurring task repeating every ${rule} ${endMsg}.</p>`;
      }

      const result = await this.resend.emails.send({
        from: `${senderName} <${fromEmail}>`,
        to: [user.email],
        subject: `New Task Assigned: ${task.title}`,
        html: `
          <h1>New Task Assigned</h1>
          <p>Hi ${user.first_name || user.email},</p>
          <p>You have been assigned a new task: <strong>${task.title}</strong></p>
          <p><strong>Priority:</strong> ${task.priority}</p>
          <p><strong>Due Date:</strong> ${task.due_date ? new Date(task.due_date).toLocaleDateString() : "N/A"}</p>
          ${recurrenceInfo}
          <p>Please log in to the ERP to view more details.</p>
        `,
      });

      const success = result.error === null && !!result.data?.id;
      if (success) {
        this.logger.log(
          `Task assignment email sent successfully to ${user.email} (id: ${result.data?.id})`,
        );
      } else if (result.error) {
        this.logger.warn(`Resend error: ${JSON.stringify(result.error)}`);
      }
      return success;
    } catch (e: any) {
      this.logger.error(`Failed to send task assignment email: ${e.message}`);
      return false;
    }
  }

  async sendTaskOverdueNotification(
    toEmail: string,
    task: any,
    escalationLevel: number,
  ): Promise<boolean> {
    try {
      const fromEmail = this.configService.get<string>(
        "RESEND_FROM_EMAIL",
        "info@mtjfoundation.com",
      );
      const senderName = this.configService.get<string>(
        "SENDER_NAME",
        "MTJ Foundation",
      );

      if (!this.resend) {
        this.logger.error("Resend is not configured - cannot send email");
        return false;
      }

      const subject = `Urgent: Task Overdue Escalation (Level ${escalationLevel}) - ${task.title}`;

      const result = await this.resend.emails.send({
        from: `${senderName} <${fromEmail}>`,
        to: [toEmail],
        subject,
        html: generateTaskOverdueTemplate(task, escalationLevel),
      });

      const success = !!result.data?.id;
      if (success) {
        this.logger.log(
          `Sent task overdue notification via Resend to ${toEmail} (id: ${result.data?.id})`,
        );
      } else if (result.error) {
        this.logger.warn(`Resend error: ${JSON.stringify(result.error)}`);
      }
      return success;
    } catch (error: any) {
      this.logger.error(`Task overdue email send failed: ${error?.message}`);
      return false;
    }
  }
}
