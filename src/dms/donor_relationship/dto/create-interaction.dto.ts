import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";

export class CreateDonorInteractionDto {
  @IsInt()
  donor_id: number;

  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  activity_type: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  custom_activity_title?: string;

  @IsString()
  @IsNotEmpty()
  user_action_text: string;

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
  next_followup_datetime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  status?: string;

  @IsOptional()
  @IsInt()
  assigned_to_user_id?: number;

  @IsOptional()
  @IsString()
  activity_datetime?: string;
}
