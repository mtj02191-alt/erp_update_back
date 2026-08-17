export interface DonorAuditChange {
  field: string;
  old_value: string | number | boolean | null;
  new_value: string | number | boolean | null;
}

export interface LogDonorAuditParams {
  donorId: number;
  action: string;
  source: string;
  changes: DonorAuditChange[];
  performedByUserId?: number | null;
  metadata?: Record<string, unknown> | null;
}
