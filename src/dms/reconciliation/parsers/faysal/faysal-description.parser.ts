import { ReconciliationDonorHints } from "../reconciliation-donor-hints";

export type FaysalParsedDonorHints = ReconciliationDonorHints & {
  pattern: "raast" | "digibank" | "unknown";
};

const RAAST_PREFIX = "RAAST FUND RECEIVED FROM ";

export function parseFaysalTranDescription(
  tranDescription: string,
  transferAccountNo?: string | null,
  transferAccountTitle?: string | null,
  transferBranchName?: string | null,
): FaysalParsedDonorHints {
  const desc = tranDescription.trim();
  const upper = desc.toUpperCase();

  if (upper.startsWith(RAAST_PREFIX)) {
    return { ...parseRaastDescription(desc), pattern: "raast" };
  }

  if (
    upper.startsWith("DONATION PAYMENT") ||
    upper.startsWith("FUNDS TRANSFERRED")
  ) {
    return {
      donorName: transferAccountTitle?.trim() || null,
      bank: "FAYSAL",
      accountLastDigits: lastAccountDigits(transferAccountNo),
      descriptionRef: parseDigiBankRef(desc),
      branch: transferBranchName?.trim() || null,
      pattern: "digibank",
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

function parseRaastDescription(desc: string): Omit<
  FaysalParsedDonorHints,
  "pattern"
> {
  const rest = desc.slice(RAAST_PREFIX.length).trim();
  if (!rest) {
    return {
      donorName: null,
      bank: null,
      accountLastDigits: null,
      descriptionRef: null,
      branch: null,
    };
  }

  const segments = rest.split(" - ").map((s) => s.trim());
  const donorName = segments[0] || null;
  let bank: string | null = null;
  let accountLastDigits: string | null = null;
  let descriptionRef: string | null = null;

  for (let i = 1; i < segments.length; i++) {
    const seg = segments[i];
    if (!seg) continue;

    const refMatch = seg.match(/^REF#\s*(.+)$/i);
    if (refMatch) {
      descriptionRef = refMatch[1].trim();
      continue;
    }

    const bankAcctMatch = seg.match(/^([A-Z0-9*]+)\s+A\/C#\s*\*(\d+)$/i);
    if (bankAcctMatch) {
      bank = bankAcctMatch[1].replace(/\*$/, "") || bankAcctMatch[1];
      accountLastDigits = bankAcctMatch[2];
      continue;
    }

    const acctOnly = seg.match(/^A\/C#\s*\*(\d+)$/i);
    if (acctOnly) {
      accountLastDigits = acctOnly[1];
      continue;
    }

    if (/^[A-Z0-9*]{1,10}$/i.test(seg)) {
      bank = seg.replace(/\*$/, "") || seg;
    }
  }

  return { donorName, bank, accountLastDigits, descriptionRef, branch: null };
}

function parseDigiBankRef(desc: string): string | null {
  const match = desc.match(/Ref\s*#\s*(\d+)/i);
  return match?.[1] ?? null;
}

function lastAccountDigits(accountNo?: string | null): string | null {
  const digits = String(accountNo || "").replace(/\D/g, "");
  if (digits.length < 4) return digits || null;
  return digits.slice(-4);
}
