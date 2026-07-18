import { IsString, IsOptional, IsDateString, IsInt } from "class-validator";

export class CreateWhatsAppDto {
  @IsString()
  @IsOptional()
  type?: string;

  @IsString()
  contact_name: string;

  @IsString()
  phone_number: string;

  @IsString()
  @IsOptional()
  message_summary?: string;

  @IsString()
  @IsOptional()
  required_action?: string;

  @IsString()
  @IsOptional()
  attachment_url?: string;

  @IsString()
  @IsOptional()
  response_status?: string;

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
