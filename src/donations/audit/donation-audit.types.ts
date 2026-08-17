export interface DonationAuditChange {
  field: string;
  old_value: string | number | boolean | null;
  new_value: string | number | boolean | null;
}

export interface LogDonationAuditParams {
  donationId: number;
  action: string;
  source: string;
  changes: DonationAuditChange[];
  performedByUserId?: number | null;
  metadata?: Record<string, unknown> | null;
}
