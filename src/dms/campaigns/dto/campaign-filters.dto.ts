import {
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  IsDateString,
} from "class-validator";
import { Type } from "class-transformer";
import { CampaignStatus } from "../entities/campaign.entity";

export class CampaignFiltersDto {
  @IsOptional()
  @IsEnum(CampaignStatus)
  status?: CampaignStatus;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  project_id?: number;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
