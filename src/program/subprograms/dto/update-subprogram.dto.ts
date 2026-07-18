import { IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";

export class UpdateSubprogramDto {
  @IsInt()
  @Min(1)
  @IsOptional()
  program_id?: number;

  @IsString()
  @IsOptional()
  key?: string;

  @IsString()
  @IsOptional()
  label?: string;

  @IsString()
  @IsOptional()
  @IsIn(["active", "inactive"])
  status?: "active" | "inactive";
}
