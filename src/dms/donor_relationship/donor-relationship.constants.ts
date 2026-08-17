export const DONOR_ACTIVITY_TYPES = [
  "call",
  "whatsapp",
  "email",
  "visit",
  "meeting",
  "dinner_invitation",
  "event_invitation",
  "proposal_shared",
  "thank_you",
  "donation_request",
  "pledge_followup",
  "complaint",
  "feedback",
  "relationship_building",
  "custom",
] as const;

export const DONOR_RESPONSE_TYPES = [
  "positive",
  "interested",
  "need_details",
  "busy",
  "committed",
  "not_responding",
  "refused",
  "neutral",
  "negative",
] as const;

export const INTERACTION_STATUSES = [
  "completed",
  "need_followup",
  "pending",
  "no_response",
  "rescheduled",
  "closed",
] as const;

export const FOLLOWUP_STATUSES = [
  "pending",
  "overdue",
  "completed",
  "rescheduled",
  "no_response",
  "cancelled",
] as const;

export type DonorActivityType = (typeof DONOR_ACTIVITY_TYPES)[number];
export type InteractionStatus = (typeof INTERACTION_STATUSES)[number];
export type FollowupStatus = (typeof FOLLOWUP_STATUSES)[number];
