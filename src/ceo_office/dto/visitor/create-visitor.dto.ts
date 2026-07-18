import { IsString, IsOptional, IsDateString, IsInt } from "class-validator";

export class CreateVisitorDto {
  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  visitor_name: string;

  @IsString()
  @IsOptional()
  organization?: string;

  @IsString()
  purpose: string;

  @IsString()
  @IsOptional()
  meeting_with?: string;

  @IsString()
  @IsOptional()
  department?: string;

  @IsString()
  @IsOptional()
  protocol_required?: string;

  @IsString()
  @IsOptional()
  expected_duration?: string;

  @IsString()
  @IsOptional()
  visitor_outcome?: string;

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
