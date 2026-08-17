export enum CampaignTargetFrequency {
  DAILY = "daily",
  WEEKLY = "weekly",
  BI_WEEKLY = "bi_weekly",
  MONTHLY = "monthly",
  QUARTERLY = "quarterly",
  YEARLY = "yearly",
}

export const CAMPAIGN_TARGET_FREQUENCIES = Object.values(
  CampaignTargetFrequency,
);
