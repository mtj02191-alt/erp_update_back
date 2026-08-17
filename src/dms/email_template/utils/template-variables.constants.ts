export const TEMPLATE_CHANNELS = ["email", "sms", "whatsapp"] as const;
export const TEMPLATE_PURPOSES = [
  "campaign",
  "appeal",
  "event",
  "general",
  "recurring_reminder",
  "thanks",
  "marketing",
  "payment_link",
] as const;
export const TEMPLATE_STATUSES = ["draft", "active", "archived"] as const;

export const TEMPLATE_VARIABLE_KEYS = [
  "donor_name",
  "amount",
  "campaign_name",
  "appeal_name",
  "event_name",
  "campaign_url",
  "appeal_url",
  "event_url",
  "donation_url",
  "cta_url",
  "cta_button_text",
  "unsubscribe_url",
  "current_month",
] as const;

export const CTA_BUTTON_TEXT_OPTIONS = [
  "Donate Now",
  "View Event",
  "Learn More",
  "Support Now",
  "Read More",
] as const;

export type TemplateChannel = (typeof TEMPLATE_CHANNELS)[number];
export type TemplatePurpose = (typeof TEMPLATE_PURPOSES)[number];
export type TemplateStatus = (typeof TEMPLATE_STATUSES)[number];
export type TemplateVariableKey = (typeof TEMPLATE_VARIABLE_KEYS)[number];
