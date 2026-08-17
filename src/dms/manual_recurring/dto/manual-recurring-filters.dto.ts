import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
} from "class-validator";
import { Type } from "class-transformer";
import { ManualRecurringStatus } from "../utils/manual-recurring.constants";
import { CampaignTargetFrequency } from "../../campaigns/utils/campaign-recurring.constants";

export class ManualRecurringPledgeFiltersDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(ManualRecurringStatus)
  status?: ManualRecurringStatus;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  donor_id?: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  campaign_id?: number;

  /** pending = no thanks yet; completed = has thanks/payment period */
  @IsOptional()
  @IsString()
  installment_status?: string;
}

export class ProcessManualRecurringRemindersDto {
  /**
   * Period override:
   * - monthly: YYYY-MM
   * - daily: YYYY-MM-DD
   * - weekly: YYYY-MM-DD_YYYY-MM-DD
   */
  @IsOptional()
  @IsString()
  period_key?: string;

  /** Limit job to one target_frequency (daily|weekly|monthly|…). */
  @IsOptional()
  @IsEnum(CampaignTargetFrequency)
  frequency?: CampaignTargetFrequency;

  /** When true (and frequency omitted), run all frequencies due today in PKT. */
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  run_due?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  dry_run?: boolean;

  /** Send even if already reminded this period */
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  force?: boolean;

  /** Pledges processed per DB batch (default from env or 500) */
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  chunk_size?: number;

  /** Include per-donor detail rows in the response (off by default at scale) */
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  include_details?: boolean;
}
