import { IsDate, IsBoolean, IsNumber, Min, IsOptional } from "class-validator";
import { Type } from "class-transformer";

export class CreateRationReportDto {
  @IsDate()
  @Type(() => Date)
  report_date: Date;

  @IsBoolean()
  @IsOptional()
  is_alternate?: boolean;

  @IsNumber()
  @Min(0)
  @IsOptional()
  full_widows?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  full_divorced?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  full_disable?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  full_indegent?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  full_orphan?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  half_widows?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  half_divorced?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  half_disable?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  half_indegent?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  half_orphan?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  life_time?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  life_time_full_widows?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  life_time_full_divorced?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  life_time_full_disable?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  life_time_full_indegent?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  life_time_full_orphan?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  life_time_half_widows?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  life_time_half_divorced?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  life_time_half_disable?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  life_time_half_indegent?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  life_time_half_orphan?: number;
}
