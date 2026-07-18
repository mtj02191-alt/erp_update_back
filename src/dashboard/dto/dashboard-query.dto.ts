import {
  IsOptional,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsString,
  IsArray,
} from "class-validator";
import { Type, Transform } from "class-transformer";

export class DashboardSummaryQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(24)
  months?: number = 6;
}

export class DashboardMonthlyQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  months?: number = 12;
}

export class DashboardEventsQueryDto {
  @IsOptional()
  @IsDateString()
  month?: string; // e.g. 2025-06-01
}

export class DashboardOverviewQueryDto {
  /** Year for the overview (e.g. 2024). If not set, uses current year. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  /** Alternatively: last N months from today (overrides year if both provided). */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  months?: number;
}

export class DashboardFundraisingOverviewQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(2000)
  @Max(2100)
  year?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(60)
  months?: number = 12;

  @IsOptional()
  @IsString()
  donation_type?: string;

  @IsOptional()
  @IsString()
  donation_method?: string;

  /** Comma-separated ref/campaign values (e.g. "MTJ-123,MTJ-456") */
  @IsOptional()
  @IsString()
  ref?: string;

  /** Comma-separated project IDs (e.g. "health,education,clean-water") */
  @IsOptional()
  @IsString()
  projects?: string;

  @IsOptional()
  @IsString()
  date?: string;

  @IsOptional()
  @IsString()
  start_date?: string;

  @IsOptional()
  @IsString()
  end_date?: string;
}
