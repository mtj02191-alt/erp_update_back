import { Type } from "class-transformer";
import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from "class-validator";

export class CreateDreamSchoolReportLineDto {
  @IsInt()
  dream_school_id: number;

  @IsInt()
  @Min(0)
  visits: number;

  @IsString()
  @IsOptional()
  remarks?: string;

  @IsString()
  @IsNotEmpty()
  @IsIn(["good", "poor", "excellent", "medium"])
  teacher_performance: "good" | "poor" | "excellent" | "medium";
}

export class CreateDreamSchoolReportDto {
  @IsString()
  @IsNotEmpty()
  report_month: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CreateDreamSchoolReportLineDto)
  lines: CreateDreamSchoolReportLineDto[];
}
