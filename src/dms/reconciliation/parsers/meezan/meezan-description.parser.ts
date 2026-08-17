import { ReconciliationDonorHints } from "../reconciliation-donor-hints";

export type MeezanParsedDonorHints = ReconciliationDonorHints & {
  pattern:
    | "donation_zakat"
    | "money_received"
    | "raast_p2p"
    | "cash_deposit"
    | "inward_telex"
    | "masked"
    | "unknown";
};

export function parseMeezanDescription(
  description: string,
): MeezanParsedDonorHints {
  const desc = description.trim();
  const upper = desc.toUpperCase();

  if (upper.startsWith("DONATION-ZAKAT")) {
    return { ...parseDonationZakat(desc), pattern: "donation_zakat" };
  }

  if (upper.includes("RAAST P2P FUND TRANSFER")) {
    return { ...parseRaastP2p(desc), pattern: "raast_p2p" };
  }

  if (upper.startsWith("MONEY RECEIVED FROM")) {
    return { ...parseMoneyReceived(desc), pattern: "money_received" };
  }

  if (upper.startsWith("ONLINE CASH DEPOSIT")) {
    return {
      donorName: null,
      bank: "MEEZAN",
      accountLastDigits: null,
      descriptionRef: parseCashDepositRef(desc),
      branch: parseCashDepositBranch(desc),
      pattern: "cash_deposit",
    };
  }

  if (upper.startsWith("INWARD TELEX PAYMENT")) {
    return {
      donorName: null,
      bank: "MEEZAN",
      accountLastDigits: null,
      descriptionRef: null,
      branch: null,
      pattern: "inward_telex",
    };
  }

  if (desc.startsWith("....")) {
    return {
      donorName: null,
      bank: "MEEZAN",
      accountLastDigits: null,
      descriptionRef: parseMaskedStan(desc),
      branch: parseMaskedBranch(desc),
      pattern: "masked",
    };
  }

  return {
    donorName: null,
    bank: null,
    accountLastDigits: null,
    descriptionRef: null,
    branch: null,
    pattern: "unknown",
  };
}

function parseDonationZakat(
  desc: string,
): Omit<MeezanParsedDonorHints, "pattern"> {
  const stanMatch = desc.match(/STAN\s*\((\d+)\)/i);
  const fromMatch = desc.match(/FROM:\s*(\d+)-(.+?)\s+(\d{4})\s+(.+)$/i);
  if (fromMatch) {
    return {
      donorName: fromMatch[2].trim(),
      bank: "MEEZAN",
      accountLastDigits: lastAccountDigits(fromMatch[1]),
      descriptionRef: stanMatch?.[1] ?? null,
      branch: `${fromMatch[3]} ${fromMatch[4]}`.trim(),
    };
  }
  const fromShort = desc.match(/FROM:\s*(\d+)-(.+)$/i);
  return {
    donorName: fromShort?.[2]?.trim() || null,
    bank: "MEEZAN",
    accountLastDigits: fromShort ? lastAccountDigits(fromShort[1]) : null,
    descriptionRef: stanMatch?.[1] ?? null,
    branch: null,
  };
}

function parseMoneyReceived(
  desc: string,
): Omit<MeezanParsedDonorHints, "pattern"> {
  const walletMatch = desc.match(
    /Money Received from\s+(.+?)\s+(JAZZCASH|EASYPAISA)\s+(\S+)\s+STAN\((\d+)\)/i,
  );
  if (walletMatch) {
    return {
      donorName: walletMatch[1].trim(),
      bank: walletMatch[2].toUpperCase(),
      accountLastDigits: lastAccountDigits(walletMatch[3]),
      descriptionRef: walletMatch[4],
      branch: null,
    };
  }

  const extBankMatch = desc.match(
    /Money Received from\s+(.+?)\s+(HBL|UBL|MCB|BML)\s+(\S+)\s+STAN\((\d+)\)/i,
  );
  if (extBankMatch) {
    return {
      donorName: extBankMatch[1].trim(),
      bank: extBankMatch[2].toUpperCase(),
      accountLastDigits: lastAccountDigits(extBankMatch[3]),
      descriptionRef: extBankMatch[4],
      branch: null,
    };
  }

  const alfalahMatch = desc.match(
    /Money Received from\s+ALFALAH\s+(\S+)\s+STAN\((\d+)\)/i,
  );
  if (alfalahMatch) {
    return {
      donorName: "ALFALAH",
      bank: "ALFALAH",
      accountLastDigits: lastAccountDigits(alfalahMatch[1]),
      descriptionRef: alfalahMatch[2],
      branch: null,
    };
  }

  const meezanMatch = desc.match(
    /Money Received from\s+(.+?)\s+A\/C\s+([\d-]+)\s+STAN\s*\((\d+)\)\s+(\d{4})\s+(.+)$/i,
  );
  if (meezanMatch) {
    return {
      donorName: meezanMatch[1].trim(),
      bank: "MEEZAN",
      accountLastDigits: lastAccountDigits(meezanMatch[2]),
      descriptionRef: meezanMatch[3],
      branch: `${meezanMatch[4]} ${meezanMatch[5]}`.trim(),
    };
  }

  const meezanShort = desc.match(
    /Money Received from\s+(.+?)\s+A\/C\s+([\d-]+)\s+STAN\s*\((\d+)\)/i,
  );
  if (meezanShort) {
    return {
      donorName: meezanShort[1].trim(),
      bank: "MEEZAN",
      accountLastDigits: lastAccountDigits(meezanShort[2]),
      descriptionRef: meezanShort[3],
      branch: null,
    };
  }

  return {
    donorName: null,
    bank: null,
    accountLastDigits: null,
    descriptionRef: null,
    branch: null,
  };
}

function parseRaastP2p(desc: string): Omit<MeezanParsedDonorHints, "pattern"> {
  const match = desc.match(
    /from\s+(.+?)\s+RAXXXXXXXXXXXXXXXXXX\d+\s+(\S+)\s+0001 MEEZAN BANK LIMITED/i,
  );
  if (!match) {
    return {
      donorName: null,
      bank: null,
      accountLastDigits: null,
      descriptionRef: null,
      branch: null,
    };
  }
  return {
    donorName: match[1].trim(),
    bank: inferBankFromRaastRef(match[2]),
    accountLastDigits: null,
    descriptionRef: match[2],
    branch: null,
  };
}

function parseCashDepositRef(desc: string): string | null {
  const match = desc.match(/Online Cash Deposit\s+(\S+)/i);
  return match?.[1] ?? null;
}

function parseCashDepositBranch(desc: string): string | null {
  const match = desc.match(/Online Cash Deposit\s+\S+\s+(\d{4}\s+.+)$/i);
  return match?.[1]?.trim() || null;
}

function parseMaskedStan(desc: string): string | null {
  const match = desc.match(/STAN\((\d+)\)/i);
  return match?.[1] ?? null;
}

function parseMaskedBranch(desc: string): string | null {
  const match = desc.match(/\d{4}\s+(.+)$/);
  return match?.[1]?.trim() || null;
}

function inferBankFromRaastRef(ref: string): string {
  const prefix = ref.replace(/\d+$/, "").toUpperCase();
  const map: Record<string, string> = {
    MBMB: "MEEZAN",
    UBL: "UBL",
    SADAPKKA: "SADAPAY",
    ASCMPKKA: "ASKARI",
    MPBL: "MOBILINK",
    ABPAPKKA: "ALBARAKA",
    NAYAPKKA: "NAYAPAY",
    BAHLPKKA: "BAHL",
    NBPBPKKA: "NBP",
  };
  for (const [key, bank] of Object.entries(map)) {
    if (prefix.startsWith(key)) return bank;
  }
  return "RAAST";
}

function lastAccountDigits(accountNo?: string | null): string | null {
  const digits = String(accountNo || "").replace(/\D/g, "");
  if (digits.length < 4) return digits || null;
  return digits.slice(-4);
}
