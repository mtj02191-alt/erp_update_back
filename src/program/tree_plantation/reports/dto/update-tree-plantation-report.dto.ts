import { IsDate, IsNumber, IsString, Min, IsOptional } from "class-validator";
import { Type } from "class-transformer";

export class UpdateTreePlantationReportDto {
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  report_date?: Date;

  @IsString()
  @IsOptional()
  school_name?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  plants?: number;
}
