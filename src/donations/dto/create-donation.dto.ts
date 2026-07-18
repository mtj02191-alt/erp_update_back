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
} from "class-validator";
import { DonationMethod } from "src/utils/enums";

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
      "donation_method must be one of: meezan, blinq, payfast, stripe, stripe_embed",
  })
  donation_method?: DonationMethod;

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
}
