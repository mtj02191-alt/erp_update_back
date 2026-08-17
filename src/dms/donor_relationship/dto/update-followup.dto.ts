import { IsOptional, IsString, MaxLength } from "class-validator";

export class UpdateDonorFollowupDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  followup_title?: string;

  @IsOptional()
  @IsString()
  followup_reason?: string;

  @IsOptional()
  @IsString()
  due_datetime?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  status?: string;
}
