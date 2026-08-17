export interface DonationBoxDonationAuditChange {
  field: string;
  old_value: string | number | boolean | null;
  new_value: string | number | boolean | null;
}

export interface LogDonationBoxDonationAuditParams {
  donationBoxDonationId: number;
  action: string;
  source: string;
  changes: DonationBoxDonationAuditChange[];
  performedByUserId?: number | null;
  metadata?: Record<string, unknown> | null;
}
