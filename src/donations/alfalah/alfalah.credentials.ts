export type AlfalahEnvMode = "sandbox" | "production";

export interface AlfalahCredentials {
  baseUrl: string;
  merchantId: string;
  storeId: string;
  merchantHash: string;
  merchantUsername: string;
  merchantPassword: string;
  key1: string;
  key2: string;
  /** Page redirection channel for card (APG guide: 1001). */
  cardChannelId: string;
  /** ReturnURL on SSO + post-payment redirect (public API). */
  returnUrl: string;
  /** HS_ReturnURL for step-1 auth_token (public API). */
  hsReturnUrl: string;
}

export function getAlfalahEnvMode(): AlfalahEnvMode {
  const raw = (process.env.ALFALAH_ENV || "production").toLowerCase().trim();
  return raw === "sandbox" ? "sandbox" : "production";
}

export function isAlfalahSandbox(): boolean {
  return getAlfalahEnvMode() === "sandbox";
}

/** Pad/truncate to 16 UTF-8 chars for APG AES keys (sandbox fallback only). */
export function padApgKey16(value: string, fallback: string): string {
  const src = (value || fallback || "sandbox-default0").slice(0, 16);
  return src.padEnd(16, "0");
}

function resolveMerchantId(): string {
  return (
    process.env.APG_MERCHANT_ID ||
    process.env.ALFALAH_MERCHANT_ID ||
    process.env.ALFALAH_SANDBOX_MERCHANT_ID ||
    ""
  );
}

function resolveStoreId(): string {
  return (
    process.env.APG_STORE_ID ||
    process.env.ALFALAH_STORE_ID ||
    process.env.ALFALAH_SANDBOX_STORE_ID ||
    ""
  );
}

/**
 * Resolve APG credentials.
 * - Always required: APG_MERCHANT_ID, APG_STORE_ID, hash, username, password
 * - Sandbox only: APG_KEY1 / APG_KEY2 optional (derived from merchant/store if omitted)
 * - Production: APG_KEY1 / APG_KEY2 required (16 chars each)
 */
export function resolveAlfalahCredentials(): AlfalahCredentials & {
  env: AlfalahEnvMode;
} {
  const env = getAlfalahEnvMode();
  const sandbox = env === "sandbox";

  const baseUrl = (
    process.env.APG_BASE_URL ||
    (sandbox
      ? "https://sandbox.bankalfalah.com"
      : "https://payments.bankalfalah.com")
  ).replace(/\/$/, "");

  const merchantHash = process.env.APG_MERCHANT_HASH || "";
  const merchantUsername = process.env.APG_MERCHANT_USERNAME || "";
  const merchantPassword = process.env.APG_MERCHANT_PASSWORD || "";
  const merchantId = resolveMerchantId();
  const storeId = resolveStoreId();

  let key1 = process.env.APG_KEY1 || process.env.ALFALAH_KEY1 || "";
  let key2 = process.env.APG_KEY2 || process.env.ALFALAH_KEY2 || "";

  if (!merchantHash || !merchantUsername || !merchantPassword) {
    throw new Error(
      "Bank Alfalah APG credentials missing: APG_MERCHANT_HASH, APG_MERCHANT_USERNAME, APG_MERCHANT_PASSWORD are required",
    );
  }

  if (!merchantId || !storeId) {
    throw new Error(
      "Bank Alfalah APG credentials missing: APG_MERCHANT_ID and APG_STORE_ID are required",
    );
  }

  if (sandbox) {
    if (!key1) {
      key1 = padApgKey16(merchantId, "sandbox-key1");
    }
    if (!key2) {
      key2 = padApgKey16(storeId, "sandbox-key2");
    }
  } else {
    if (!key1 || !key2) {
      throw new Error(
        "Bank Alfalah APG production credentials missing: APG_KEY1 and APG_KEY2 are required",
      );
    }
    if (key1.length !== 16 || key2.length !== 16) {
      throw new Error(
        "APG_KEY1 and APG_KEY2 must each be exactly 16 characters in production",
      );
    }
  }

  const apiBase =
    process.env.API_PUBLIC_BASE_URL ||
    process.env.BASE_API_URL ||
    `http://localhost:${process.env.PORT || 3000}`;

  const returnUrl =
    process.env.APG_RETURN_URL ||
    `${apiBase.replace(/\/$/, "")}/donations/public/alfalah/return`;

  const hsReturnUrl =
    process.env.APG_HS_RETURN_URL ||
    process.env.APG_CARD_HS_RETURN_URL ||
    returnUrl;

  return {
    env,
    baseUrl,
    merchantId,
    storeId,
    merchantHash,
    merchantUsername,
    merchantPassword,
    key1: padApgKey16(key1, merchantId),
    key2: padApgKey16(key2, storeId),
    cardChannelId: process.env.APG_CARD_CHANNEL_ID || "1001",
    returnUrl,
    hsReturnUrl,
  };
}
