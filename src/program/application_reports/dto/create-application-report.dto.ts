import {
  IsString,
  IsDate,
  IsOptional,
  IsArray,
  ValidateNested,
  IsNotEmpty,
  IsNumber,
  Min,
  IsObject,
} from "class-validator";
import { Type } from "class-transformer";
import { User } from "../../../users/user.entity";

export class CreateApplicationDto {
  @IsString()
  @IsNotEmpty()
  project: string;

  @IsString()
  @IsNotEmpty()
  subprogram: string;

  @IsNumber()
  @Min(0)
  pending_last_month: number;

  @IsNumber()
  @Min(0)
  application_count: number;

  @IsNumber()
  @Min(0)
  investigation_count: number;

  @IsNumber()
  @Min(0)
  verified_count: number;

  @IsNumber()
  @Min(0)
  approved_count: number;

  @IsNumber()
  @Min(0)
  rejected_count: number;

  @IsNumber()
  @Min(0)
  pending_count: number;
}

export class CreateApplicationReportDto {
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  report_date: Date;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateApplicationDto)
  @IsNotEmpty()
  applications: CreateApplicationDto[];

  @IsOptional()
  @IsObject()
  created_by?: User;

  @IsOptional()
  @IsObject()
  updated_by?: User;
}
