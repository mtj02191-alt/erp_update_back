import {
  IsDate,
  IsString,
  IsIn,
  IsNumber,
  Min,
  IsOptional,
} from "class-validator";
import { Type } from "class-transformer";

export class UpdateWheelChairOrCrutchesReportDto {
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  date?: Date;

  @IsString()
  @IsIn(["Wheel Chair", "Crutches"])
  @IsOptional()
  type?: string;

  @IsString()
  @IsIn(["Male", "Female"])
  @IsOptional()
  gender?: string;

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
