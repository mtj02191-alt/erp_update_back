import { IsOptional, IsString, IsNumber } from "class-validator";

/**
 * Partial update for donation core fields. In-kind line items are not updated via this DTO.
 */
export class UpdateDonationDto {
  @IsOptional()
  @IsNumber()
  amount?: number;

  @IsOptional()
  @IsNumber()
  paid_amount?: number;

  @IsOptional()
  @IsString()
  currency?: string;

  /** ISO date string (YYYY-MM-DD) */
  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  donation_type?: string;

  @IsOptional()
  @IsString()
  donation_method?: string;

  @IsOptional()
  @IsString()
  donation_source?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  country?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  project_id?: string;

  @IsOptional()
  @IsString()
  project_name?: string;

  @IsOptional()
  @IsNumber()
  campaign_id?: number | null;

  @IsOptional()
  @IsNumber()
  sub_program_id?: number | null;

  @IsOptional()
  @IsNumber()
  event_id?: number | null;

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

  @IsOptional()
  @IsString()
  ref?: string;

  @IsOptional()
  @IsString()
  on_behalf_names?: string | null;
}
