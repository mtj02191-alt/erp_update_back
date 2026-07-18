import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";

export class UpdateDreamSchoolReportLineDto {
  @IsInt()
  dream_school_id: number;

  @IsInt()
  @Min(0)
  visits: number;

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsString()
  @IsIn(["good", "poor", "excellent", "medium"])
  teacher_performance: "good" | "poor" | "excellent" | "medium";
}

export class UpdateDreamSchoolReportDto {
  @IsString()
  @IsOptional()
  report_month?: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => UpdateDreamSchoolReportLineDto)
  @IsOptional()
  lines?: UpdateDreamSchoolReportLineDto[];
}
