export const MEEZAN_BANK_NAME = "meezan";

export const MEEZAN_SHEET = {
  BATCH_SIZE: 100,
} as const;

export const MEEZAN_COL = {
  BOOKING_DATE: 0,
  VALUE_DATE: 1,
  DOC_NO: 2,
  DESCRIPTION: 3,
  DEBIT: 4,
  CREDIT: 5,
  BALANCE: 6,
} as const;

export const MEEZAN_HEADER =
  "Booking Date,Value Date,Doc No,Description,Debit,Credit,Available Balance";
