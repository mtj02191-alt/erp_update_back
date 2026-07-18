import {
  IsDateString,
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export const HEALTH_REPORT_TYPES = [
  "In-house",
  "Referred",
  "Surgeries Supported",
  "Ambulance",
  "Medicines",
] as const;

export class CreateHealthDto {
  @IsDateString()
  date: string;

  @IsString()
  @IsIn([...HEALTH_REPORT_TYPES])
  type: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  widows?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  divorced?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  disable?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  indegent?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  orphans?: number;
}
