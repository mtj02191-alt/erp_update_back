import { Injectable, HttpException } from "@nestjs/common";
import { CreatePayfastDto } from "./dto/create-payfast.dto";
import { UpdatePayfastDto } from "./dto/update-payfast.dto";
import axios from "axios";

@Injectable()
export class PayfastService {
  private accessToken: string | null = null;
  private tokenExpiry: number | null = null;

  // Get PayFast access token (independent of donation)
  async getAccessToken(donationId?: string, amount?: number): Promise<any> {
    try {
      console.log("🔑 Getting PayFast access token...");

      // Check if we have a valid token
      if (
        this.accessToken &&
        this.tokenExpiry &&
        Date.now() < this.tokenExpiry
      ) {
        console.log("✅ Using existing valid token");

        // If donationId and amount provided, create payment request
        if (donationId && amount) {
          return await this.createPaymentRequest(
            donationId,
            amount,
            this.accessToken,
          );
        }

        // Otherwise, just return the token
        return {
          success: true,
          token: this.accessToken,
          expiresIn: Math.floor((this.tokenExpiry - Date.now()) / 1000),
          message: "Access token retrieved successfully",
        };
      }

      // Get PayFast credentials from environment
      const merchant_id = process.env.PF_MERCHANT_ID;
      const secured_key = process.env.PF_SECURED_KEY;
      const payfast_base_url = "https://ipg1.apps.net.pk/Ecommerce/api";

      if (!merchant_id || !secured_key) {
        throw new HttpException("PayFast credentials not configured", 500);
      }

      // Prepare token request payload
      const tokenPayload = {
        merchant_id,
        secured_key,
        grant_type: "client_credentials",
        customer_ip: "127.0.0.1", // You might want to get this from request
        api_version: "v1",
      };

      console.log("📤 Sending token request to PayFast...");

      // Call PayFast token endpoint
      const response = await axios.post(
        `https://ipg1.apps.net.pk/Ecommerce/api/Transaction/GetAccessToken?MERCHANT_ID=18034&SECURED_KEY=38Xi7BVgiZ7upanHIQiMB`,
        tokenPayload,
        {
          headers: {
            "Content-Type": "application/json",
          },
          timeout: 30000, // 30 second timeout
        },
      );

      const tokenData = response.data;

      if (!tokenData.token) {
        throw new HttpException("Failed to get PayFast access token", 500);
      }

      // Store token and expiry
      this.accessToken = tokenData.token;
      this.tokenExpiry = Date.now() + tokenData.expiry * 1000; // Convert seconds to milliseconds

      console.log(
        "✅ PayFast access token obtained successfully tokenData.token",
        tokenData.token,
      );
      return;
      // console.log(`⏰ Token expires in ${tokenData.expiry} seconds`);

      // If donationId and amount provided, create payment request
      // if (donationId && amount) {
      //   return await this.createPaymentRequest(donationId, amount, this.accessToken);
      // }

      // Otherwise, just return the token
      return {
        success: true,
        token: this.accessToken,
        expiresIn: tokenData.expiry,
        message: "Access token obtained successfully",
      };
    } catch (error) {
      console.error("❌ PayFast token error:", error.message);
      throw new HttpException(
        `PayFast authentication failed: ${error.message}`,
        500,
      );
    }
  }

  // Create PayFast payment request
  async createPaymentRequest(
    donationId: string,
    amount: number,
    accessToken?: string,
  ): Promise<any> {
    try {
      console.log(
        `💳 Creating PayFast payment request for donation ${donationId}...`,
      );

      // Use provided token or get a new one
      const token = accessToken || (await this.getAccessToken());
      const actualToken = token.token || token;

      const payfast_base_url =
        process.env.PF_BASE_URL || "https://api.payfast.co.za";
      const return_url = `${process.env.BASE_Frontend_URL}/thanks?donation_id=${donationId}`;
      const cancel_url = `${process.env.BASE_Frontend_URL}/donate?cancelled=true`;

      // Prepare payment request payload
      const paymentPayload = {
        merchant_id: process.env.PF_MERCHANT_ID,
        merchant_key: process.env.PF_MERCHANT_KEY,
        return_url,
        cancel_url,
        notify_url: `${process.env.BASE_Backend_URL}/donations/payfast/ipn`,
        name_first: "Donor",
        name_last: "Anonymous",
        email_address: "donor@example.com",
        cell_number: "0000000000",
        m_payment_id: donationId,
        amount: amount.toString(),
        item_name: `Donation #${donationId}`,
        item_description: "Charitable Donation",
        custom_str1: donationId,
        custom_str2: "donation",
        custom_str3: "charity",
        custom_str4: "",
        custom_str5: "",
        custom_int1: "",
        custom_int2: "",
        custom_int3: "",
        custom_int4: "",
        custom_int5: "",
        payment_method: "cc",
        subscription_type: 0,
        billing_date: new Date().toISOString().split("T")[0],
        recurring_amount: "",
        cycles: 0,
        frequency: 0,
      };

      console.log("📤 Sending payment request to PayFast...");

      // Call PayFast payment endpoint
      const response = await axios.post(
        `${payfast_base_url}/payments`,
        paymentPayload,
        {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${actualToken}`,
          },
          timeout: 30000,
        },
      );

      const paymentData = response.data;

      console.log("✅ PayFast payment request created successfully");
      console.log("🔗 Payment URL:", paymentData.payment_url);

      return {
        success: true,
        paymentUrl: paymentData.payment_url,
        paymentId: paymentData.payment_id,
        basketId: donationId,
        amount: amount,
        token: actualToken,
        rawResponse: paymentData,
      };
    } catch (error) {
      console.error("❌ PayFast payment request error:", error.message);
      throw new HttpException(
        `PayFast payment request failed: ${error.message}`,
        500,
      );
    }
  }

  // Verify PayFast payment status
  async verifyPayment(paymentId: string, accessToken?: string): Promise<any> {
    try {
      const token = accessToken || this.accessToken;
      if (!token) {
        throw new HttpException("No access token available", 500);
      }

      const payfast_base_url =
        process.env.PF_BASE_URL || "https://api.payfast.co.za";

      const response = await axios.get(
        `${payfast_base_url}/payments/${paymentId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 30000,
        },
      );

      return response.data;
    } catch (error) {
      throw new HttpException(
        `PayFast payment verification failed: ${error.message}`,
        500,
      );
    }
  }

  // Legacy CRUD methods (keeping for compatibility)
  create(createPayfastDto: CreatePayfastDto) {
    return "This action adds a new payfast";
  }

  findAll() {
    return `This action returns all payfast`;
  }

  findOne(id: number) {
    return `This action returns a #${id} payfast`;
  }

  update(id: number, updatePayfastDto: UpdatePayfastDto) {
    return `This action updates a #${id} payfast`;
  }

  remove(id: number) {
    return `This action removes a #${id} payfast`;
  }
}
