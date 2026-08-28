import { IsBoolean, IsNumber, IsOptional, IsString } from "class-validator";

export class CreateWebsiteHomeHeroSlideDto {
  @IsOptional()
  @IsString()
  title?: string | null;

  @IsString()
  desktop_image_url: string;

  @IsString()
  mobile_image_url: string;

  @IsOptional()
  @IsString()
  link?: string | null;

  @IsOptional()
  @IsNumber()
  sort_order?: number;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
