import { IsInt, IsOptional, IsString, MaxLength } from "class-validator";

export class GenerateSocialPostAiDto {
  @IsOptional()
  @IsInt()
  appeal_id?: number;

  @IsOptional()
  @IsInt()
  campaign_id?: number;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  context?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  tone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  platform?: string;
}
