/** Faysal Transact account statement — Sheet2 column indices (0-based). */
export const FAYSAL_SHEET = {
  DATA_SHEET_NAME: "Sheet2",
  HEADER_ROW_INDEX: 0,
  BATCH_SIZE: 100,
} as const;

export const FAYSAL_COL = {
  SERIAL_NO: 0,
  TRAN_SEQ_NO: 1,
  TRAN_DATE: 2,
  EFFECT_DATE: 3,
  TRAN_TYPE: 4,
  TRAN_DESCRIPTION: 5,
  STAN: 6,
  DEBIT_CREDIT: 7,
  REFERENCE: 8,
  WITHDRAWAL_AMOUNT: 9,
  DEPOSIT_AMOUNT: 10,
  BALANCE: 11,
  REF_BANK: 12,
  TIME_STAMP: 13,
  TRANSFER_ACCOUNT_NO: 14,
  TRANSFER_ACCOUNT_TITLE: 15,
  TRANSFER_BRANCH: 16,
  TRANSFER_BRANCH_NAME: 17,
  BRANCH: 18,
} as const;

export const FAYSAL_CREDIT = "C";
export const FAYSAL_DEBIT = "D";

export const FAYSAL_BANK_NAME = "faysal";
