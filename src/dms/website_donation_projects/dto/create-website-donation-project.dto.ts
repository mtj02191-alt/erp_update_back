import { Type } from "class-transformer";
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  ValidateIf,
  ValidateNested,
} from "class-validator";

export class WebsiteDonationInitiativeDto {
  @IsOptional()
  @IsNumber()
  id?: number;

  @IsString()
  slug: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  subtitle?: string | null;

  @IsOptional()
  @IsNumber()
  price?: number;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsString()
  duration?: string | null;

  @IsOptional()
  @IsString()
  icon_key?: string | null;

  @IsOptional()
  @IsString()
  template_code?: string | null;

  @IsOptional()
  @IsNumber()
  sort_order?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class CreateWebsiteDonationProjectDto {
  @IsString()
  slug: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  icon_key?: string | null;

  @IsOptional()
  @IsNumber()
  price?: number | null;

  @IsOptional()
  @IsBoolean()
  is_new?: boolean;

  @IsOptional()
  @IsBoolean()
  is_default?: boolean;

  @IsOptional()
  @IsString()
  template_code?: string | null;

  @IsOptional()
  @IsNumber()
  sort_order?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;

  @IsOptional()
  @IsString()
  listing_image_url?: string | null;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WebsiteDonationInitiativeDto)
  initiatives?: WebsiteDonationInitiativeDto[];

  /** Project detail page content for MediaContentSection / FAQs / PageHeader. */
  @IsOptional()
  @ValidateIf((_, value) => value !== null)
  @IsObject()
  page_content?: Record<string, unknown> | null;
}
