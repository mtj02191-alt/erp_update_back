export type JazzCashEnvMode = "sandbox" | "production";

export interface JazzCashCredentials {
  env: JazzCashEnvMode;
  merchantId: string;
  password: string;
  integritySalt: string;
  mwalletUrl: string;
  statusInquiryUrl: string;
  ipnUrl: string;
}

export function getJazzCashEnvMode(): JazzCashEnvMode {
  const raw = (process.env.JAZZCASH_ENV || "sandbox").toLowerCase().trim();
  return raw === "production" ? "production" : "sandbox";
}

/**
 * JazzCash MWallet REST API v2.0 (2026) + Status Inquiry v2.0:
 * Sandbox and Production use the same Payment Orchestrator host.
 * Sandbox vs live is controlled by merchant credentials from
 * https://onlinepayments.jazzcash.com.pk/sandbox-frontend/
 */
const ORCHESTRATOR_BASE =
  "https://onlinepayments.jazzcash.com.pk/payment-orchestrator";

const DEFAULT_MWALLET_URL = `${ORCHESTRATOR_BASE}/api/v2/rest/payments/m-wallet`;
const DEFAULT_STATUS_INQUIRY_URL = `${ORCHESTRATOR_BASE}/api/v2/rest/payments/status/inquiry`;

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
    mwalletUrl: process.env.JAZZCASH_MWALLET_URL || DEFAULT_MWALLET_URL,
    statusInquiryUrl:
      process.env.JAZZCASH_STATUS_INQUIRY_URL || DEFAULT_STATUS_INQUIRY_URL,
    ipnUrl,
  };
}
