import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from "class-validator";
import { SocialPostStatus } from "../entities/social-post.entity";

export class CreateSocialPostDto {
  @IsOptional()
  @IsInt()
  campaign_id?: number;

  @IsOptional()
  @IsInt()
  appeal_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  buffer_channel_id?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  buffer_channel_name?: string;

  @IsOptional()
  @IsString()
  post_text?: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(1000)
  image_url?: string;

  @IsOptional()
  @IsDateString()
  scheduled_at?: string;

  @IsOptional()
  @IsEnum(SocialPostStatus)
  status?: SocialPostStatus;

  /** When true, push to Buffer immediately after save. */
  @IsOptional()
  publish_to_buffer?: boolean;
}
