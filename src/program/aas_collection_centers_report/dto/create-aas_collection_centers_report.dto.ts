import { Type } from "class-transformer";
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from "class-validator";

export class CampWisePatientRowDto {
  @IsString()
  @IsNotEmpty()
  camp_name: string;

  @IsInt()
  @Min(0)
  patients: number;
}

export class CreateAasCollectionCentersReportDto {
  @IsInt()
  @Min(0)
  total_patients: number;

  @IsInt()
  @Min(0)
  tests_conducted: number;

  @IsInt()
  @Min(0)
  pending_tests: number;

  @IsNumber()
  @Min(0)
  revenue: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  on_time_delivery_percent: number;

  @IsInt()
  @Min(0)
  total_camps: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CampWisePatientRowDto)
  camp_wise_patients?: CampWisePatientRowDto[];
}
