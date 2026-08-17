import {
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  IsDateString,
  IsBoolean,
} from "class-validator";
import { Type } from "class-transformer";
import { CampaignStatus } from "../entities/campaign.entity";
import { CampaignTargetFrequency } from "../utils/campaign-recurring.constants";

export class CampaignFiltersDto {
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  project_id?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  program_id?: number;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  sub_program_id?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_recurring?: boolean;

  @IsOptional()
  @IsEnum(CampaignTargetFrequency)
  target_frequency?: CampaignTargetFrequency;
}
