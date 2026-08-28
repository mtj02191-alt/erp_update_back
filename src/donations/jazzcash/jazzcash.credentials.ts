export type JazzCashEnvMode = "sandbox" | "production";

export interface JazzCashCredentials {
  env: JazzCashEnvMode;
  merchantId: string;
  password: string;
  integritySalt: string;
  subMerchantName: string;
  mwalletUrl: string;
  statusInquiryUrl: string;
  ipnUrl: string;
}

export function getJazzCashEnvMode(): JazzCashEnvMode {
  const raw = (process.env.JAZZCASH_ENV || "sandbox").toLowerCase().trim();
  return raw === "production" ? "production" : "sandbox";
}

/**
 * JazzCash endpoints — sandbox vs production use different hosts.
 * Override with JAZZCASH_MWALLET_URL / JAZZCASH_STATUS_INQUIRY_URL if needed.
 */
const SANDBOX_ORCHESTRATOR_BASE =
  "https://onlinepayments.jazzcash.com.pk/payment-orchestrator";

const SANDBOX_MWALLET_URL = `${SANDBOX_ORCHESTRATOR_BASE}/api/v2/rest/payments/m-wallet`;
const SANDBOX_STATUS_INQUIRY_URL = `${SANDBOX_ORCHESTRATOR_BASE}/api/v2/rest/payments/status/inquiry`;

const PRODUCTION_MWALLET_URL =
  "https://pgw.jazzcash.com.pk/api/2.0/purchase/domwallettransaction";
const PRODUCTION_STATUS_INQUIRY_URL =
  "https://pgw.jazzcash.com.pk/ApplicationAPI/API/PaymentInquiry/Inquire";

export function resolveJazzCashCredentials(): JazzCashCredentials {
  const env = getJazzCashEnvMode();
  const merchantId = process.env.JAZZCASH_MERCHANT_ID || "";
  const password = process.env.JAZZCASH_PASSWORD || "";
  const integritySalt =
    process.env.JAZZCASH_INTEGRITY_SALT || process.env.JAZZCASH_HASH_KEY || "";

  if (!merchantId || !password || !integritySalt) {
    throw new Error(
      "JazzCash credentials missing: JAZZCASH_MERCHANT_ID, JAZZCASH_PASSWORD, JAZZCASH_INTEGRITY_SALT are required",
    );
  }

  const defaultMwalletUrl =
    env === "production" ? PRODUCTION_MWALLET_URL : SANDBOX_MWALLET_URL;
  const defaultStatusInquiryUrl =
    env === "production"
      ? PRODUCTION_STATUS_INQUIRY_URL
      : SANDBOX_STATUS_INQUIRY_URL;

  const apiBase =
    process.env.API_PUBLIC_BASE_URL ||
    process.env.BASE_API_URL ||
    `http://localhost:${process.env.PORT || 3000}`;

  const ipnUrl =
    process.env.JAZZCASH_IPN_URL ||
    `${apiBase.replace(/\/$/, "")}/donations/public/jazzcash/ipn`;

  return {
    env,
    merchantId,
    password,
    integritySalt,
    subMerchantName:
      process.env.JAZZCASH_SUB_MERCHANT_NAME ||
      "MOLANA TARIQ JAMIL FOUNDATION",
    mwalletUrl: process.env.JAZZCASH_MWALLET_URL || defaultMwalletUrl,
    statusInquiryUrl:
      process.env.JAZZCASH_STATUS_INQUIRY_URL || defaultStatusInquiryUrl,
    ipnUrl,
  };
}
