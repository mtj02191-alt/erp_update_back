import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsDateString,
  MaxLength,
  Min,
  ValidateIf,
  ValidateNested,
  IsArray,
} from "class-validator";
import { Type } from "class-transformer";
import { AppealCategory, AppealStatus } from "../entities/appeal.entity";

export class CreateAppealsBenificiaryDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  age?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  profile_image_url?: string;
}

export class CreateAppealDto {
  @IsString()
  @MaxLength(250)
  title: string;

  @IsOptional()
  @IsString()
  @MaxLength(260)
  slug?: string;

  @IsOptional()
  @IsString()
  short_description?: string;

  @IsOptional()
  @IsString()
  story?: string;

  @IsOptional()
  @IsEnum(AppealStatus)
  status?: AppealStatus;

  @IsOptional()
  @IsEnum(AppealCategory)
  category?: AppealCategory;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  tags?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Type(() => Number)
  goal_amount?: number;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  currency?: string;

  @IsOptional()
  @IsDateString()
  start_at?: string;

  @IsOptional()
  @IsDateString()
  @ValidateIf((o) => o.start_at != null)
  end_at?: string;

  @IsOptional()
  @IsString()
  cover_image_url?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_featured?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_urgent?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_verified?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  donation_protected?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  organizer_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  organizer_location?: string;

  @IsOptional()
  @IsString()
  organizer_bio?: string;

  @IsOptional()
  @IsString()
  organizer_image_url?: string;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  organizer_verified?: boolean;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  impact_points?: string[];

  @IsOptional()
  @ValidateNested()
  @Type(() => CreateAppealsBenificiaryDto)
  beneficiary?: CreateAppealsBenificiaryDto;

  /** Gallery image URLs (from S3 upload) saved as appeal_media rows. */
  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  gallery_image_urls?: string[];
}
