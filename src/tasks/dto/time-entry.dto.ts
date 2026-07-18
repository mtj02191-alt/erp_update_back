import { IsIn, IsInt, IsOptional, IsString, Min } from "class-validator";

export class TimeEntryDto {
  @IsString()
  @IsIn(["start", "stop", "manual"])
  action: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  seconds?: number;

  @IsOptional()
  @IsString()
  notes?: string;
}
