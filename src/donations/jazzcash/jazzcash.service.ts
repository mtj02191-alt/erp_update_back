import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import axios from "axios";
import {
  buildJazzCashSecureHash,
  verifyJazzCashSecureHash,
} from "./jazzcash-hash.util";
import {
  JazzCashCredentials,
  resolveJazzCashCredentials,
} from "./jazzcash.credentials";

export interface JazzCashMWalletPaymentParams {
  donationId: number;
  amount: number;
  mobileNumber: string;
  cnicLast6: string;
  description?: string;
  billReference?: string;
}

export interface JazzCashMWalletPaymentResult {
  success: boolean;
  pp_TxnRefNo: string;
  pp_ResponseCode: string;
  pp_ResponseMessage: string;
  pp_AuthCode?: string;
  pp_RetreivalReferenceNo?: string;
  raw: Record<string, unknown>;
  hashVerified: boolean;
}

@Injectable()
export class JazzCashService {
  private readonly logger = new Logger(JazzCashService.name);

  getCredentials(): JazzCashCredentials {
    return resolveJazzCashCredentials();
  }

  /** Format date/time in PKT as YYYYMMDDHHMMSS */
  formatPktDateTime(date: Date = new Date()): string {
    const fmt = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Asia/Karachi",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
    const parts = fmt.formatToParts(date);
    const get = (type: string) =>
      parts.find((p) => p.type === type)?.value || "00";
    return `${get("year")}${get("month")}${get("day")}${get("hour")}${get("minute")}${get("second")}`;
  }

  /** JazzCash amount: multiply PKR by 100 (last two digits = paisa) */
  toGatewayAmount(amount: number): string {
    const paisa = Math.round(Number(amount) * 100);
    if (!Number.isFinite(paisa) || paisa <= 0) {
      throw new BadRequestException("Invalid donation amount for JazzCash");
    }
    return String(paisa);
  }

  fromGatewayAmount(gatewayAmount: string | number): number {
    const n = Number(gatewayAmount);
    if (!Number.isFinite(n)) return 0;
    return n / 100;
  }

  normalizeMobileNumber(phone: string): string {
    let digits = String(phone || "").replace(/\D/g, "");
    if (digits.startsWith("92") && digits.length >= 12) {
      digits = `0${digits.slice(2)}`;
    }
    if (!digits.startsWith("0") && digits.length === 10) {
      digits = `0${digits}`;
    }
    if (!/^03\d{9}$/.test(digits)) {
      throw new BadRequestException(
        "JazzCash mobile number must be a valid Pakistani mobile (03XXXXXXXXX)",
      );
    }
    return digits;
  }

  normalizeCnicLast6(cnic: string): string {
    const digits = String(cnic || "").replace(/\D/g, "");
    if (!/^\d{6}$/.test(digits)) {
      throw new BadRequestException(
        "JazzCash requires the last 6 digits of CNIC",
      );
    }
    return digits;
  }

  /**
   * pp_TxnRefNo — unique; 2026 guide recommends T + YmdHis (PKT).
   * Append donation id so concurrent charges stay unique.
   */
  buildTxnRefNo(donationId: number): string {
    return `T${this.formatPktDateTime()}${donationId}`;
  }

  /** pp_BillReference — mandatory alphanumeric only (A–Z, a–z, 0–9). */
  buildBillReference(donationId: number): string {
    return `D${donationId}`.replace(/[^A-Za-z0-9]/g, "").slice(0, 20);
  }

  isSuccessfulPaymentResponse(responseCode: string): boolean {
    const code = String(responseCode || "").trim();
    return code === "000" || code === "121";
  }

  isFailedPaymentResponse(responseCode: string): boolean {
    const code = String(responseCode || "").trim();
    return ["199", "999"].includes(code) || (code !== "" && !this.isSuccessfulPaymentResponse(code));
  }

  /**
   * MWallet REST API v2.0 (with CNIC) — synchronous wallet charge.
   */
  async initiateMWalletPayment(
    params: JazzCashMWalletPaymentParams,
  ): Promise<JazzCashMWalletPaymentResult> {
    const creds = this.getCredentials();
    const mobile = this.normalizeMobileNumber(params.mobileNumber);
    const cnic = this.normalizeCnicLast6(params.cnicLast6);
    const pp_TxnRefNo = this.buildTxnRefNo(params.donationId);
    const pp_BillReference =
      params.billReference || this.buildBillReference(params.donationId);
    const pp_TxnDateTime = this.formatPktDateTime();
    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 1);
    const pp_TxnExpiryDateTime = this.formatPktDateTime(expiry);

    const payload: Record<string, string> = {
      pp_Amount: this.toGatewayAmount(params.amount),
      pp_BankID: "",
      pp_BillReference,
      pp_CNIC: cnic,
      pp_Description: (params.description || "Donation").slice(0, 200),
      pp_Language: "EN",
      pp_MerchantID: creds.merchantId,
      pp_MobileNumber: mobile,
      pp_Password: creds.password,
      pp_ProductID: "",
      pp_SubMerchantID: "",
      pp_SubMerchantName: creds.subMerchantName,
      pp_TxnCurrency: "PKR",
      pp_TxnDateTime,
      pp_TxnExpiryDateTime,
      pp_TxnRefNo,
      ppmpf_1: "",
      ppmpf_2: "",
      ppmpf_3: "",
      ppmpf_4: "",
      ppmpf_5: "",
    };

    payload.pp_SecureHash = buildJazzCashSecureHash(payload, creds.integritySalt);

    this.logger.log(
      `JazzCash MWallet request donation #${params.donationId} txn ${pp_TxnRefNo} env=${creds.env} mobile=${mobile.slice(0, 4)}*****${mobile.slice(-2)} cnic=****${cnic.slice(-2)} url=${creds.mwalletUrl}`,
    );

    const { data } = await axios.post<Record<string, unknown>>(
      creds.mwalletUrl,
      payload,
      {
        headers: { "Content-Type": "application/json" },
        timeout: 60000,
      },
    );

    const raw = data || {};
    const hashVerified = verifyJazzCashSecureHash(raw, creds.integritySalt);
    if (!hashVerified) {
      this.logger.warn(
        `JazzCash response hash verification failed for ${pp_TxnRefNo}`,
      );
    }

    const pp_ResponseCode = String(raw.pp_ResponseCode ?? "");
    const pp_ResponseMessage = String(raw.pp_ResponseMessage ?? "");

    this.logger.log(
      `JazzCash MWallet response donation #${params.donationId} txn ${pp_TxnRefNo} code=${pp_ResponseCode} msg=${pp_ResponseMessage}`,
    );

    return {
      success:
        hashVerified && this.isSuccessfulPaymentResponse(pp_ResponseCode),
      pp_TxnRefNo: String(raw.pp_TxnRefNo || pp_TxnRefNo),
      pp_ResponseCode,
      pp_ResponseMessage,
      pp_AuthCode: raw.pp_AuthCode != null ? String(raw.pp_AuthCode) : undefined,
      pp_RetreivalReferenceNo:
        raw.pp_RetreivalReferenceNo != null
          ? String(raw.pp_RetreivalReferenceNo)
          : raw.pp_RetrievalReferenceNo != null
            ? String(raw.pp_RetrievalReferenceNo)
            : undefined,
      raw,
      hashVerified,
    };
  }

  /** Status inquiry v2 — for pending / missing final status (call ≥10 min after initiate). */
  async inquireTransactionStatus(pp_TxnRefNo: string): Promise<{
    success: boolean;
    paymentCompleted: boolean;
    pp_ResponseCode: string;
    pp_PaymentResponseCode: string;
    pp_Status: string;
    raw: Record<string, unknown>;
    hashVerified: boolean;
  }> {
    const creds = this.getCredentials();
    const payload: Record<string, string> = {
      pp_TxnRefNo,
      pp_MerchantID: creds.merchantId,
      pp_Password: creds.password,
    };
    payload.pp_SecureHash = buildJazzCashSecureHash(payload, creds.integritySalt);

    const { data } = await axios.post<Record<string, unknown>>(
      creds.statusInquiryUrl,
      payload,
      {
        headers: { "Content-Type": "application/json" },
        timeout: 60000,
      },
    );

    const raw = data || {};
    const hashVerified = verifyJazzCashSecureHash(raw, creds.integritySalt);
    const pp_ResponseCode = String(raw.pp_ResponseCode ?? "");
    const pp_PaymentResponseCode = String(raw.pp_PaymentResponseCode ?? "");
    const pp_Status = String(raw.pp_Status ?? "");

    const paymentCompleted =
      hashVerified &&
      pp_ResponseCode === "000" &&
      (pp_PaymentResponseCode === "121" ||
        pp_Status.toLowerCase() === "completed");

    return {
      success: pp_ResponseCode === "000",
      paymentCompleted,
      pp_ResponseCode,
      pp_PaymentResponseCode,
      pp_Status,
      raw,
      hashVerified,
    };
  }

  /** Merchant IPN acknowledgement body */
  buildIpnAcknowledgement(): Record<string, string> {
    const creds = this.getCredentials();
    const body: Record<string, string> = {
      pp_ResponseCode: "000",
      pp_ResponseMessage: "IPN received successfully",
    };
    body.pp_SecureHash = buildJazzCashSecureHash(body, creds.integritySalt);
    this.logger.log(
      `JazzCash IPN ack built env=${creds.env} merchantId=${creds.merchantId} ` +
        `body=${JSON.stringify(body)}`,
    );
    return body;
  }
}
