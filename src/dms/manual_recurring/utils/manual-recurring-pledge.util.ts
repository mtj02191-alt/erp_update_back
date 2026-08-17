import { PledgeMode } from "./manual-recurring.constants";
import {
  addMonthsToPeriodKey,
  computePrepaidEndPeriodKey,
  getMonthlyPeriodKey,
  isPeriodKeyInRange,
} from "./manual-recurring-period.util";
import { ManualRecurringPledge } from "../entities/manual-recurring-pledge.entity";
import { ManualRecurringPledgeLine } from "../entities/manual-recurring-pledge-line.entity";
import { CampaignDonationItem } from "../../campaigns/entities/campaign-donation-item.entity";

export function isPrepaidPeriodCovered(
  pledge: Pick<
    ManualRecurringPledge,
    "pledge_mode" | "prepaid_start_period_key" | "prepaid_end_period_key"
  >,
  periodKey: string,
): boolean {
  if (pledge.pledge_mode !== PledgeMode.PREPAID_MONTHS) return false;
  return isPeriodKeyInRange(
    periodKey,
    pledge.prepaid_start_period_key,
    pledge.prepaid_end_period_key,
  );
}

export function computePeriodAmountFromLines(
  lines: Array<
    Pick<ManualRecurringPledgeLine, "quantity"> & {
      campaign_item?: Pick<CampaignDonationItem, "unit_price"> | null;
    }
  >,
): number {
  let total = 0;
  for (const line of lines) {
    const price = Number(line.campaign_item?.unit_price ?? 0);
    const qty = Number(line.quantity ?? 0);
    total += price * qty;
  }
  return Math.round(total * 100) / 100;
}

export function computeTotalPledgedAmount(
  periodAmount: number,
  pledgeMode: string,
  prepaidMonths?: number | null,
): number {
  if (pledgeMode === PledgeMode.PREPAID_MONTHS && prepaidMonths) {
    return Math.round(periodAmount * prepaidMonths * 100) / 100;
  }
  return periodAmount;
}

export function resolvePrepaidPeriodKeys(
  pledgeMode: string,
  prepaidMonths?: number | null,
  prepaidStart?: string | null,
): { start: string | null; end: string | null } {
  if (pledgeMode !== PledgeMode.PREPAID_MONTHS || !prepaidMonths) {
    return { start: null, end: null };
  }
  const start = prepaidStart || getMonthlyPeriodKey();
  const end = computePrepaidEndPeriodKey(start, prepaidMonths);
  return { start, end };
}

export function formatPledgeItemsSummary(
  lines: Array<
    Pick<ManualRecurringPledgeLine, "quantity"> & {
      campaign_item?: Pick<
        CampaignDonationItem,
        "name" | "unit_price" | "currency"
      > | null;
    }
  >,
): string {
  return lines
    .map((line) => {
      const item = line.campaign_item;
      if (!item) return null;
      const price = Number(item.unit_price);
      return `${line.quantity}x ${item.name} (${item.currency || "PKR"} ${price.toLocaleString()})`;
    })
    .filter(Boolean)
    .join(", ");
}

export function formatPrepaidCoverageLabel(
  startKey: string | null,
  endKey: string | null,
): string {
  if (!startKey || !endKey) return "";
  if (startKey === endKey) return startKey;
  return `${startKey} to ${endKey}`;
}
