/** Home-visit / field verification checklist (no geo/photo evidence in this phase). */
export const AID_VERIFICATION_CHECKLIST_ITEMS = [
  {
    key: "home_visited",
    label: "Home / field visit completed",
    required: true,
  },
  {
    key: "identity_confirmed",
    label: "Beneficiary identity confirmed (name / CNIC)",
    required: true,
  },
  {
    key: "address_confirmed",
    label: "Residence / address confirmed",
    required: true,
  },
  {
    key: "family_confirmed",
    label: "Family composition confirmed (parents / spouse / kids / siblings)",
    required: true,
  },
  {
    key: "need_verified",
    label: "Aid need verified as genuine",
    required: true,
  },
  {
    key: "livelihood_reviewed",
    label: "Profession / monthly income situation reviewed",
    required: true,
  },
  {
    key: "duplicates_reviewed",
    label: "Duplicate / prior-aid flags reviewed",
    required: true,
  },
  {
    key: "eligible_recommended",
    label: "Case recommended for CEO approval",
    required: true,
  },
] as const;

export type AidVerificationChecklistKey =
  (typeof AID_VERIFICATION_CHECKLIST_ITEMS)[number]["key"];

export type AidVerificationChecklist = Partial<
  Record<AidVerificationChecklistKey, boolean>
> & {
  /** Optional freeform answers keyed by checklist item */
  item_notes?: Partial<Record<AidVerificationChecklistKey, string>>;
};
