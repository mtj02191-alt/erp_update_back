import { IsInt, IsOptional, IsString, Max, Min } from "class-validator";

export class UpdateTaskProgressDto {
  @IsInt()
  @Min(0)
  @Max(100)
  progress: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
