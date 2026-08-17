import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import {
  ManualRecurringFrequency,
  ManualRecurringStatus,
  PledgeMode,
} from "../utils/manual-recurring.constants";
import { ManualRecurringPledgeLineDto } from "./manual-recurring-pledge-line.dto";

export class CreateManualRecurringPledgeDto {
  @IsInt()
  @Type(() => Number)
  donor_id: number;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  campaign_id?: number | null;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  pledged_amount?: number | null;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @IsOptional()
  @IsEnum(ManualRecurringFrequency)
  frequency?: ManualRecurringFrequency;

  @IsOptional()
  @IsEnum(ManualRecurringStatus)
  status?: ManualRecurringStatus;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  remind_via_email?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  remind_via_whatsapp?: boolean;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  email_template_id?: number | null;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  whatsapp_template_id?: number | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsEnum(PledgeMode)
  pledge_mode?: PledgeMode;

  /** Required when pledge_mode is prepaid_months */
  @IsOptional()
  @IsInt()
  @Min(1)
  @Type(() => Number)
  prepaid_months?: number | null;

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}$/)
  prepaid_start_period_key?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ManualRecurringPledgeLineDto)
  lines?: ManualRecurringPledgeLineDto[];
}
