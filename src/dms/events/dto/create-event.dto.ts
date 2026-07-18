import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsDateString,
  MaxLength,
  Min,
} from "class-validator";
import { Type } from "class-transformer";
import { EventStatus, EventType } from "../entities/event.entity";

export class CreateEventDto {
  @IsString()
  @MaxLength(200)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(220)
  slug?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;

  @IsOptional()
  @IsEnum(EventType)
  event_type?: EventType;

  @IsDateString()
  start_at: string;

  @IsDateString()
  end_at: string;

  @IsOptional()
  @IsString()
  location?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  campaign_id?: number;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_public?: boolean;

  @IsNumber()
  @Min(0)
  @Type(() => Number)
  allowed_attendees: number;
}
