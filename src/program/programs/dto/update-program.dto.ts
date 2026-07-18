import { IsBoolean, IsIn, IsOptional, IsString } from "class-validator";

export class UpdateProgramDto {
  @IsString()
  @IsOptional()
  key?: string;

  @IsString()
  @IsOptional()
  label?: string;

  @IsString()
  @IsOptional()
  logo?: string;

  @IsString()
  @IsOptional()
  @IsIn(["active", "inactive"])
  status?: "active" | "inactive";

  @IsBoolean()
  @IsOptional()
  applicationable?: boolean;
}
