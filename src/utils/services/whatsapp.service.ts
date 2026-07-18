import { Injectable, Logger, OnModuleInit } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import axios from "axios";

@Injectable()
export class WhatsAppService implements OnModuleInit {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly apiUrl = "https://api.digiconn.co/v1/api/outgoing/message";
  private token?: string;

  constructor(private configService: ConfigService) {
    this.initializeToken();
    this.validateConfiguration();
  }

  private initializeToken() {
    this.token = this.configService.get<string>("WHATSAPP_API_TOKEN", "");

    if (!this.token) {
      this.logger.warn(
        "WHATSAPP_API_TOKEN not configured - WhatsApp service will not work",
      );
    } else {
      this.logger.log("WhatsApp service token initialized");
    }
  }

  async onModuleInit() {
    const token = this.configService.get<string>("WHATSAPP_API_TOKEN", "");

    if (!token) {
      this.logger.warn(
        "WHATSAPP_API_TOKEN not set - WhatsApp service will not work",
      );
      this.logger.warn("Set WHATSAPP_API_TOKEN in environment variables");
    } else {
      this.logger.log("WhatsApp service ready");
    }
  }

  private validateConfiguration() {
    const token = this.configService.get<string>("WHATSAPP_API_TOKEN", "");

    if (token) {
      this.logger.log("WhatsApp service configured");
    } else {
      this.logger.error(
        "WhatsApp service not configured - WHATSAPP_API_TOKEN not found",
      );
      this.logger.warn("Get WhatsApp API token from Digiconn dashboard");
    }
  }

  /**
   * Send payment confirmation WhatsApp message
   * @param data Payment confirmation data
   * @returns Promise<boolean> - true if sent successfully, false otherwise
   */
  async sendPaymentConfirmation(data: {
    phoneNumber: string;
    userName: string;
    amount: string | number;
  }): Promise<boolean> {
    try {
      if (!this.token) {
        this.logger.error(
          "WhatsApp API token not configured - cannot send message",
        );
        return false;
      }

      // Format phone number (ensure it starts with country code, no + sign)
      const formattedPhone = this.formatPhoneNumber(data.phoneNumber);

      // Format amount as string
      const amountString =
        typeof data.amount === "number" ? data.amount.toString() : data.amount;

      const payload = {
        phone_number: formattedPhone,
        type: "template",
        parameters: {
          name: "payment_confirmation",
          language: {
            code: "en",
          },
          components: [
            {
              type: "body",
              parameters: [
                {
                  type: "text",
                  text: data.userName,
                },
                {
                  type: "text",
                  text: amountString,
                },
              ],
            },
          ],
        },
      };

      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          token: this.token,
          "Content-Type": "application/json",
        },
      });

      this.logger.log(
        `Payment confirmation WhatsApp sent to ${formattedPhone} for ${data.userName} (Amount: ${amountString})`,
      );
      this.logger.debug(
        `WhatsApp API Response: ${JSON.stringify(response.data)}`,
      );

      return true;
    } catch (error: any) {
      this.logger.error(
        `WhatsApp payment confirmation send failed: ${error?.message}`,
      );
      if (error?.response) {
        this.logger.error(
          `WhatsApp API error: ${JSON.stringify(error.response.data)}`,
        );
      }
      return false;
    }
  }

  /**
   * Send abandoned cart payment reminder WhatsApp message
   * @param data Abandoned cart data
   * @returns Promise<boolean> - true if sent successfully, false otherwise
   */
  async sendAbandonMessage(data: {
    phoneNumber: string;
    userName: string;
    amount: string | number;
    donationId: string | number;
  }): Promise<boolean> {
    try {
      if (!this.token) {
        this.logger.error(
          "WhatsApp API token not configured - cannot send message",
        );
        return false;
      }

      // Format phone number (ensure it starts with country code, no + sign)
      const formattedPhone = this.formatPhoneNumber(data.phoneNumber);

      // Format amount as string
      const amountString =
        typeof data.amount === "number" ? data.amount.toString() : data.amount;

      // Format donation ID as string
      const donationIdString =
        typeof data.donationId === "number"
          ? data.donationId.toString()
          : data.donationId;

      const payload = {
        phone_number: formattedPhone,
        type: "template",
        parameters: {
          name: "abandonded_cart_payment",
          language: {
            code: "en",
          },
          components: [
            {
              type: "body",
              parameters: [
                {
                  type: "text",
                  text: data.userName,
                },
                {
                  type: "text",
                  text: amountString,
                },
              ],
            },
            {
              type: "button",
              sub_type: "url",
              index: "0",
              parameters: [
                {
                  type: "text",
                  text: donationIdString,
                },
              ],
            },
          ],
        },
      };

      const response = await axios.post(this.apiUrl, payload, {
        headers: {
          token: this.token,
          "Content-Type": "application/json",
        },
      });

      this.logger.log(
        `Abandoned cart payment WhatsApp sent to ${formattedPhone} for ${data.userName} (Amount: ${amountString}, Donation ID: ${donationIdString})`,
      );
      this.logger.debug(
        `WhatsApp API Response: ${JSON.stringify(response.data)}`,
      );

      return true;
    } catch (error: any) {
      this.logger.error(
        `WhatsApp abandon message send failed: ${error?.message}`,
      );
      if (error?.response) {
        this.logger.error(
          `WhatsApp API error: ${JSON.stringify(error.response.data)}`,
        );
      }
      return false;
    }
  }

  /**
   * Format phone number to required format (country code without +)
   * @param phoneNumber Phone number in any format
   * @returns Formatted phone number (e.g., "923352321340")
   */
  private formatPhoneNumber(phoneNumber: string): string {
    // Remove all non-digit characters
    let cleaned = phoneNumber.replace(/\D/g, "");

    // If it starts with 0, replace with country code (Pakistan: 92)
    if (cleaned.startsWith("0")) {
      cleaned = "92" + cleaned.substring(1);
    }

    // If it doesn't start with country code, assume it's a local number and add 92
    if (!cleaned.startsWith("92") && cleaned.length <= 10) {
      cleaned = "92" + cleaned;
    }

    return cleaned;
  }

  /**
   * Test WhatsApp service connection
   * @returns Promise<{ success: boolean; message: string; details?: any }>
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    details?: any;
  }> {
    if (!this.token) {
      return {
        success: false,
        message: "WhatsApp API token not configured",
        details: {
          service: "Digiconn WhatsApp API",
          tokenConfigured: false,
          apiUrl: this.apiUrl,
        },
      };
    }

    return {
      success: true,
      message: "WhatsApp service configured",
      details: {
        service: "Digiconn WhatsApp API",
        tokenConfigured: true,
        apiUrl: this.apiUrl,
      },
    };
  }
}
