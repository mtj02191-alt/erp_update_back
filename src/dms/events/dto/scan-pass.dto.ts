import { IsString, IsOptional, MaxLength } from "class-validator";

export class ScanPassDto {
  @IsString()
  @MaxLength(80)
  pass_code: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  device_id?: string;
}
