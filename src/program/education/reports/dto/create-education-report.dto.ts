import { IsDateString, IsNumber, Min, IsOptional } from "class-validator";

export class CreateEducationReportDto {
  @IsDateString()
  date: string;

  // Male section
  @IsNumber()
  @Min(0)
  @IsOptional()
  male_orphans?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  male_divorced?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  male_disable?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  male_indegent?: number;

  // Female section
  @IsNumber()
  @Min(0)
  @IsOptional()
  female_orphans?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  female_divorced?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  female_disable?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  female_indegent?: number;
}
