import {
  IsOptional,
  IsString,
  IsEnum,
  IsNumber,
  IsDateString,
} from "class-validator";
import { Type } from "class-transformer";
import { EventStatus } from "../entities/event.entity";

export class EventFiltersDto {
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  campaign_id?: number;

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
