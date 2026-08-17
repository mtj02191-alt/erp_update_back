import {
  IsOptional,
  IsString,
  IsNumber,
  IsDateString,
  IsEmail,
  IsPhoneNumber,
  IsEnum,
  IsBoolean,
  IsInt,
  IsArray,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { DonationMethod } from "src/utils/enums";
import { DonationRecurringDto } from "./donation-recurring.dto";
import { CampaignPledgeLineDto } from "./campaign-pledge-line.dto";

export class CreateDonationDto {
  @IsOptional()
  @IsString()
  project_id?: string;

  @IsOptional()
  @IsString()
  project_name?: string;

  /**
   * Qurbani (`project_id` = qurbani-barai-mustehqeen): optional workflow template code
   * when `donation_items` is not sent (e.g. single-line checkout). Must match
   * `progress_workflow_templates.code` (e.g. `cow_share`, `cow`, `goat`).
   */
  @IsOptional()
  @IsString()
  template_code?: string;

  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsDateString()
  date?: Date;

  @IsOptional()
  @IsString()
  currency?: string;

  // Donor information
  @IsOptional()
  @IsString()
  donor_name?: string;

  @IsOptional()
  @IsEmail()
  donor_email?: string;

  @IsOptional()
  @IsString()
  donor_phone?: string;

  @IsOptional()
  @IsString()
  donation_type?: string;

  @IsOptional()
  @IsEnum(DonationMethod, {
    message:
      "donation_method must be one of: meezan, blinq, payfast, alfalah, jazzcash, stripe, stripe_embed",
  })
  donation_method?: DonationMethod;

  /** Last 6 digits of CNIC — required when donation_method is jazzcash */
  @IsOptional()
  @IsString()
  jazzcash_cnic?: string;

  @IsOptional()
  @IsString()
  donation_source?: string;

  @IsOptional()
  @IsString()
  ref?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  address?: string;

  @IsOptional()
  @IsBoolean()
  notification_subscription?: boolean;

  // Item information
  @IsOptional()
  @IsString()
  item_name?: string;

  @IsOptional()
  @IsString()
  item_description?: string;

  @IsOptional()
  @IsNumber()
  item_price?: number;

  @IsOptional()
  @IsString()
  status?: string;

  // ⭐ NEW: Cheque payment fields
  @IsOptional()
  @IsString()
  cheque_number?: string;

  @IsOptional()
  @IsString()
  bank_name?: string;

  @IsOptional()
  @IsString()
  bank?: string;

  @IsOptional()
  @IsString()
  transaction_id?: string;

  // ⭐ NEW: In-kind donation fields
  @IsOptional()
  @IsString()
  in_kind_item_name?: string;

  @IsOptional()
  @IsString()
  in_kind_description?: string;

  @IsOptional()
  @IsNumber()
  in_kind_quantity?: number;

  @IsOptional()
  @IsNumber()
  donor_id?: number;

  /** Optional soft/org credit — additive; donations still require/use donor_id as today. */
  @IsOptional()
  @IsNumber()
  organization_id?: number;

  @IsOptional()
  @IsNumber()
  campaign_id?: number;

  @IsOptional()
  @IsNumber()
  sub_program_id?: number;

  // ⭐ NEW: In-kind items array
  @IsOptional()
  in_kind_items?: Array<{
    name: string;
    item_code?: string;
    description?: string;
    category?: string;
    condition?: string;
    quantity: number;
    estimated_value?: number;
    brand?: string;
    model?: string;
    size?: string;
    color?: string;
    collection_date: string;
    collection_location?: string;
    notes?: string;
  }>;

  @IsOptional()
  @IsString()
  previous_donation_id?: string;

  @IsOptional()
  @IsString()
  donation_frequency?: string;

  /**
   * Top-level consent for recurring (website may send this and/or recurring.consent).
   * Either this or recurring.consent must be true for weekly/monthly/daily recurring.
   */
  @IsOptional()
  @IsBoolean()
  recurring_consent?: boolean;

  /**
   * Stripe recurring billing (subscription). Used when donation_method is stripe or stripe_embed.
   * Example: { "interval": "month", "interval_count": 1, "start_date_mode": "same_date", "consent": true }
   * Legacy: donation_frequency "monthly" | "weekly" | "daily" maps to interval when recurring is omitted.
   */
  @IsOptional()
  @ValidateNested()
  @Type(() => DonationRecurringDto)
  recurring?: DonationRecurringDto;

  /** When set, creates a progress tracker from this workflow template for the new donation. */
  @IsOptional()
  @IsInt()
  progress_workflow_template_id?: number;

  @IsOptional()
  @IsBoolean()
  progress_tracker_donor_visible?: boolean;

  /**
   * When the selected progress workflow template is batchable, this indicates
   * how many parts/shares this donation should reserve (e.g., 2 out of 7).
   * If omitted, the backend will attempt to derive it from amount / batch_part_amount.
   */
  @IsOptional()
  @IsInt()
  progress_batch_parts_requested?: number;

  /** Qurbani: optional on-behalf name(s), free text. */
  @IsOptional()
  @IsString()
  on_behalf_names?: string;

  /**
   * Non-Stripe recurring: enroll donor on manual_recurring_pledges at create (including pending).
   * Stripe auto-subscriptions use `recurring` instead — do not set this for Stripe.
   */
  @IsOptional()
  @IsBoolean()
  enroll_manual_recurring?: boolean;

  /** Campaign item quantities for manual recurring enrollment. */
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CampaignPledgeLineDto)
  campaign_pledge_lines?: CampaignPledgeLineDto[];

  /** recurring_monthly | prepaid_months */
  @IsOptional()
  @IsString()
  pledge_mode?: string;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  prepaid_months?: number;

  /** Days / weeks / months prepaid upfront (matches donation_frequency / recurring.interval). */
  @IsOptional()
  @IsInt()
  @Type(() => Number)
  prepaid_periods?: number;
}
