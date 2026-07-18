import { IsString, IsOptional, IsBoolean } from "class-validator";

export class AddAttachmentDto {
  @IsString()
  file_name: string;

  @IsString()
  file_url: string;

  @IsString()
  file_type: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  is_initial?: boolean;
}
