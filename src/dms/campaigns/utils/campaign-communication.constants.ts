export const CAMPAIGN_TEMPLATE_SLOTS = [
  "marketing",
  "thanks",
  "reminder",
  "payment_link",
] as const;

export type CampaignTemplateSlot = (typeof CAMPAIGN_TEMPLATE_SLOTS)[number];

export interface CampaignChannelTemplates {
  enabled?: boolean;
  email_template_id?: number | null;
  whatsapp_template_id?: number | null;
}

export interface CampaignCommunicationTemplates {
  marketing?: CampaignChannelTemplates;
  thanks?: CampaignChannelTemplates;
  reminder?: CampaignChannelTemplates;
  payment_link?: CampaignChannelTemplates;
}

export const CAMPAIGN_TEMPLATE_SLOT_LABELS: Record<
  CampaignTemplateSlot,
  string
> = {
  marketing: "Marketing",
  thanks: "Thank you",
  reminder: "Reminder",
  payment_link: "Payment link",
};

/** Maps campaign template slot → email_template purposes fallback */
export const SLOT_TO_TEMPLATE_PURPOSE: Record<
  CampaignTemplateSlot,
  string
> = {
  marketing: "marketing",
  thanks: "thanks",
  reminder: "recurring_reminder",
  payment_link: "payment_link",
};

export function normalizeCommunicationTemplates(
  raw?: CampaignCommunicationTemplates | null,
): CampaignCommunicationTemplates | null {
  if (!raw || typeof raw !== "object") return null;
  const out: CampaignCommunicationTemplates = {};
  for (const slot of CAMPAIGN_TEMPLATE_SLOTS) {
    const row = raw[slot];
    if (!row || typeof row !== "object") continue;
    out[slot] = {
      enabled: row.enabled === true,
      email_template_id:
        row.email_template_id != null ? Number(row.email_template_id) : null,
      whatsapp_template_id:
        row.whatsapp_template_id != null
          ? Number(row.whatsapp_template_id)
          : null,
    };
  }
  return Object.keys(out).length ? out : null;
}

export function getSlotTemplateId(
  templates: CampaignCommunicationTemplates | null | undefined,
  slot: CampaignTemplateSlot,
  channel: "email" | "whatsapp",
): number | null {
  const row = templates?.[slot];
  if (!row?.enabled) return null;
  const id =
    channel === "email" ? row.email_template_id : row.whatsapp_template_id;
  return id != null && Number(id) > 0 ? Number(id) : null;
}

export function isSlotEnabled(
  templates: CampaignCommunicationTemplates | null | undefined,
  slot: CampaignTemplateSlot,
): boolean {
  return templates?.[slot]?.enabled === true;
}
