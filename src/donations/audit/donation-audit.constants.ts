/** Fields staff can change via PATCH — keep in sync with `buildDonationPatch`. */
export const DONATION_AUDIT_PATCH_FIELDS = [
  "amount",
  "paid_amount",
  "currency",
  "date",
  "donation_type",
  "donation_method",
  "donation_source",
  "status",
  "country",
  "city",
  "address",
  "project_id",
  "project_name",
  "campaign_id",
  "sub_program_id",
  "event_id",
  "cheque_number",
  "bank_name",
  "bank",
  "transaction_id",
  "ref",
  "on_behalf_names",
] as const;

export const DONATION_AUDIT_NOTE_FIELDS = ["note", "noted_by"] as const;

export const DONATION_AUDIT_SKIP_PATCH_KEYS = new Set([
  "updated_by",
  "created_by",
]);
