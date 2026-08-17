export const DONATION_BOX_DONATION_AUDIT_PATCH_FIELDS = [
  "donation_box_id",
  "collection_amount",
  "collection_date",
  "collected_by_id",
  "collector_name",
  "status",
  "verified_by_id",
  "verified_at",
  "deposit_date",
  "bank_deposit_slip_no",
  "payment_method",
  "cheque_number",
  "bank_name",
  "bank_account_no",
  "notes",
  "discrepancy_notes",
  "photo_urls",
  "receipt_number",
  "is_archived",
] as const;

export const DONATION_BOX_DONATION_AUDIT_SKIP_KEYS = new Set([
  "updated_by",
  "created_by",
]);
