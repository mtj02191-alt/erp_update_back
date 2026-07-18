import { IsDate, IsNumber, Min, IsOptional } from "class-validator";
import { Type } from "class-transformer";

export class CreateFinancialAssistanceReportDto {
  @IsDate()
  @Type(() => Date)
  report_date: Date;

  @IsNumber()
  @Min(0)
  @IsOptional()
  widow?: number;

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
  extreme_poor?: number;
}
