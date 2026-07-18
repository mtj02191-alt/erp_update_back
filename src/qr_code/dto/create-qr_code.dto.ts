import { IsOptional, IsString, MaxLength } from "class-validator";

export class CreateQrCodeDto {
  @IsOptional()
  @IsString()
  @MaxLength(80)
  projectId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  campaign?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  label?: string; // BOX-001
}
