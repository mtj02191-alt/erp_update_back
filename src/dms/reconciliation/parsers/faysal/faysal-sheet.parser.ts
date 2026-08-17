import * as XLSX from "xlsx";
import {
  FAYSAL_COL,
  FAYSAL_CREDIT,
  FAYSAL_SHEET,
} from "./faysal-sheet.constants";
import {
  cleanFaysalCell,
  parseFaysalAmount,
  parseFaysalDate,
} from "./faysal-cell.util";

export type FaysalStatementRow = {
  rowIndex: number;
  serialNo: string;
  tranSeqNo: string;
  tranDate: Date | null;
  effectDate: Date | null;
  tranType: string;
  tranDescription: string;
  stan: string;
  debitCredit: string;
  reference: string;
  depositAmount: number | null;
  withdrawalAmount: number | null;
  transferAccountNo: string;
  transferAccountTitle: string;
  transferBranchName: string;
  isCredit: boolean;
};

export type FaysalParseResult = {
  rows: FaysalStatementRow[];
  skippedNonCredit: number;
  skippedMetaRows: number;
};

export function parseFaysalWorkbook(buffer: Buffer): FaysalParseResult {
  const workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
  const sheetName =
    workbook.SheetNames.find((n) => n === FAYSAL_SHEET.DATA_SHEET_NAME) ||
    workbook.SheetNames[1] ||
    workbook.SheetNames[0];

  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    throw new Error("No transaction sheet found in Faysal statement file");
  }

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  const rows: FaysalStatementRow[] = [];
  let skippedNonCredit = 0;
  let skippedMetaRows = 0;

  for (let i = FAYSAL_SHEET.HEADER_ROW_INDEX + 1; i < matrix.length; i++) {
    const raw = matrix[i] || [];
    const tranDescription = cleanFaysalCell(raw[FAYSAL_COL.TRAN_DESCRIPTION]);
    const upperDesc = tranDescription.toUpperCase();

    if (!tranDescription || upperDesc.includes("OPENING BALANCE") || upperDesc.includes("CLOSING BALANCE")) {
      skippedMetaRows += 1;
      continue;
    }

    const debitCredit = cleanFaysalCell(raw[FAYSAL_COL.DEBIT_CREDIT]).toUpperCase();
    const isCredit = debitCredit === FAYSAL_CREDIT;
    if (!isCredit) {
      skippedNonCredit += 1;
      continue;
    }

    const depositAmount = parseFaysalAmount(raw[FAYSAL_COL.DEPOSIT_AMOUNT]);
    if (depositAmount == null || depositAmount <= 0) {
      skippedMetaRows += 1;
      continue;
    }

    rows.push({
      rowIndex: i + 1,
      serialNo: cleanFaysalCell(raw[FAYSAL_COL.SERIAL_NO]),
      tranSeqNo: cleanFaysalCell(raw[FAYSAL_COL.TRAN_SEQ_NO]),
      tranDate: parseFaysalDate(raw[FAYSAL_COL.TRAN_DATE]),
      effectDate: parseFaysalDate(raw[FAYSAL_COL.EFFECT_DATE]),
      tranType: cleanFaysalCell(raw[FAYSAL_COL.TRAN_TYPE]),
      tranDescription,
      stan: cleanFaysalCell(raw[FAYSAL_COL.STAN]),
      debitCredit,
      reference: cleanFaysalCell(raw[FAYSAL_COL.REFERENCE]),
      depositAmount,
      withdrawalAmount: parseFaysalAmount(raw[FAYSAL_COL.WITHDRAWAL_AMOUNT]),
      transferAccountNo: cleanFaysalCell(raw[FAYSAL_COL.TRANSFER_ACCOUNT_NO]),
      transferAccountTitle: cleanFaysalCell(raw[FAYSAL_COL.TRANSFER_ACCOUNT_TITLE]),
      transferBranchName: cleanFaysalCell(raw[FAYSAL_COL.TRANSFER_BRANCH_NAME]),
      isCredit,
    });
  }

  return { rows, skippedNonCredit, skippedMetaRows };
}
