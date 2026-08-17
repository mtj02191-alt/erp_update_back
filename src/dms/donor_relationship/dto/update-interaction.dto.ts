import {
  IsOptional,
  IsString,
  MaxLength,
  IsNotEmpty,
} from "class-validator";

export class UpdateDonorInteractionDto {
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  activity_type?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  custom_activity_title?: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  user_action_text?: string;

  @IsOptional()
  @IsString()
  donor_response_text?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  donor_response_type?: string;

  @IsOptional()
  @IsString()
  next_action_text?: string;

  @IsOptional()
  @IsString()
  next_followup_datetime?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  status?: string;

  @IsOptional()
  @IsString()
  activity_datetime?: string;
}
