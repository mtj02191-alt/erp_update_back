import { IsDate, IsNumber, IsString, Min, IsOptional } from "class-validator";
import { Type } from "class-transformer";

export class UpdateAreaRationReportDto {
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  report_date?: Date;

  @IsString()
  @IsOptional()
  province?: string;

  @IsString()
  @IsOptional()
  district?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  quantity?: number;
}
