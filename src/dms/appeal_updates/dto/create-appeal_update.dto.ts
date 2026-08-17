import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsDateString,
  MaxLength,
  IsArray,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateAppealUpdateDto {
  @IsNumber()
  @Type(() => Number)
  appeal_id: number;

  @IsString()
  @MaxLength(250)
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsDateString()
  published_at?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_published?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_highlighted?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  image_urls?: string[];
}
