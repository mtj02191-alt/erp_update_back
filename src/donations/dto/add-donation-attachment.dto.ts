import { IsString, IsOptional } from "class-validator";

export class AddDonationAttachmentDto {
  @IsString()
  file_name: string;

  @IsString()
  file_url: string;

  @IsString()
  file_type: string;

  @IsOptional()
  @IsString()
  description?: string;
}
