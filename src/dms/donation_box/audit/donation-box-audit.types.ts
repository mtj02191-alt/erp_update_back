export interface DonationBoxAuditChange {
  field: string;
  old_value: string | number | boolean | null;
  new_value: string | number | boolean | null;
}

export interface LogDonationBoxAuditParams {
  donationBoxId: number;
  action: string;
  source: string;
  changes: DonationBoxAuditChange[];
  performedByUserId?: number | null;
  metadata?: Record<string, unknown> | null;
}
