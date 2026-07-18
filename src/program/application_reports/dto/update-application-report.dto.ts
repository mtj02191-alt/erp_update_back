import {
  IsString,
  IsDate,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNumber,
  Min,
} from "class-validator";
import { Type } from "class-transformer";

export class UpdateApplicationDto {
  @IsString()
  @IsOptional()
  project?: string;

  @IsString()
  @IsOptional()
  subprogram?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  pending_last_month?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  application_count?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  investigation_count?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  verified_count?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  approved_count?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  rejected_count?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  pending_count?: number;
}

export class UpdateApplicationReportDto {
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  report_date?: Date;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => UpdateApplicationDto)
  @IsOptional()
  applications?: UpdateApplicationDto[];
}
