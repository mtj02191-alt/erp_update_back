import { MEEZAN_COL } from "./meezan-sheet.constants";

export type MeezanStatementRow = {
  rowIndex: number;
  bookingDate: Date | null;
  valueDate: Date | null;
  docNo: string;
  description: string;
  creditAmount: number | null;
  debitAmount: number | null;
  balance: number | null;
};

export type MeezanParseResult = {
  rows: MeezanStatementRow[];
  skippedNonCredit: number;
  skippedMetaRows: number;
};

export function parseMeezanCsv(buffer: Buffer): MeezanParseResult {
  const text = buffer.toString("utf8").replace(/^\uFEFF/, "");
  const lines = text.split(/\r?\n/).filter((line) => line.trim().length > 0);

  let headerIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("Booking Date,")) {
      headerIdx = i;
      break;
    }
  }
  if (headerIdx < 0) {
    throw new Error("No transaction header found in Meezan statement CSV");
  }

  const rows: MeezanStatementRow[] = [];
  let skippedNonCredit = 0;
  let skippedMetaRows = 0;

  for (let i = headerIdx + 1; i < lines.length; i++) {
    const parsed = parseCsvLine(lines[i]);
    if (parsed.length < 7) {
      skippedMetaRows += 1;
      continue;
    }

    const description = parsed[MEEZAN_COL.DESCRIPTION]?.trim() || "";
    if (!description) {
      skippedMetaRows += 1;
      continue;
    }

    const creditRaw = parsed[MEEZAN_COL.CREDIT]?.trim() || "";
    const debitRaw = parsed[MEEZAN_COL.DEBIT]?.trim() || "";

    // Meezan: only credit (deposit) rows are reconciled — empty Credit column → skip
    if (!creditRaw) {
      skippedNonCredit += 1;
      continue;
    }

    const debitAmount = parseAmount(debitRaw);
    const creditAmount = parseAmount(creditRaw);

    if (debitAmount != null && debitAmount > 0) {
      skippedNonCredit += 1;
      continue;
    }

    if (creditAmount == null || creditAmount <= 0) {
      skippedNonCredit += 1;
      continue;
    }

    rows.push({
      rowIndex: i + 1,
      bookingDate: parseMeezanDate(parsed[MEEZAN_COL.BOOKING_DATE]),
      valueDate: parseMeezanDate(parsed[MEEZAN_COL.VALUE_DATE]),
      docNo: parsed[MEEZAN_COL.DOC_NO]?.trim() || "",
      description,
      creditAmount,
      debitAmount,
      balance: parseAmount(parsed[MEEZAN_COL.BALANCE]),
    });
  }

  return { rows, skippedNonCredit, skippedMetaRows };
}

function parseCsvLine(line: string): string[] {
  const parts: string[] = [];
  let current = "";
  let inQuotes = false;

  for (const ch of line) {
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      parts.push(current);
      current = "";
      continue;
    }
    current += ch;
  }
  parts.push(current);
  return parts;
}

function parseAmount(value?: string): number | null {
  if (!value?.trim()) return null;
  const num = Number(value.replace(/,/g, "").trim());
  return Number.isFinite(num) ? num : null;
}

function parseMeezanDate(value?: string): Date | null {
  if (!value?.trim()) return null;
  const d = new Date(value.trim());
  return Number.isNaN(d.getTime()) ? null : d;
}
