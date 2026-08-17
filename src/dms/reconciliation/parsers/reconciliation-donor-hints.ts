/** Shared donor hints from bank statement row parsers. branch → donor.address */
export type ReconciliationDonorHints = {
  donorName: string | null;
  bank: string | null;
  accountLastDigits: string | null;
  descriptionRef: string | null;
  branch: string | null;
  pattern: string;
};
