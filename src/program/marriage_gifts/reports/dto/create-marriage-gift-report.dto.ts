import { IsDate, IsNumber, Min, IsOptional } from "class-validator";
import { Type } from "class-transformer";

export class CreateMarriageGiftReportDto {
  @IsDate()
  @Type(() => Date)
  report_date: Date;

  @IsNumber()
  @Min(0)
  @IsOptional()
  orphans?: number;

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
}
