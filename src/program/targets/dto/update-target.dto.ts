import { IsInt, IsOptional, IsString, Min } from "class-validator";

export class UpdateTargetDto {
  @IsString()
  @IsOptional()
  year?: string;

  @IsString()
  @IsOptional()
  program?: string;

  @IsInt()
  @Min(0)
  @IsOptional()
  target?: number;

  @IsInt()
  @Min(0)
  @IsOptional()
  reached?: number;

  @IsString()
  @IsOptional()
  target_type?: string;
}
