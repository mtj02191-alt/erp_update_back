import { IsString, IsOptional, IsDateString, IsInt } from "class-validator";

export class CreateCallDto {
  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  caller_name: string;

  @IsString()
  @IsOptional()
  organization?: string;

  @IsString()
  phone_number: string;

  @IsString()
  @IsOptional()
  call_purpose?: string;

  @IsString()
  @IsOptional()
  call_summary?: string;

  @IsString()
  follow_up_required: string;

  @IsDateString()
  @IsOptional()
  follow_up_date?: string;

  @IsString()
  @IsOptional()
  assigned_to?: string;

  @IsDateString()
  visit_datetime: string;

  @IsInt()
  @IsOptional()
  related_note_id?: number;

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsString()
  @IsOptional()
  status?: string;
}
