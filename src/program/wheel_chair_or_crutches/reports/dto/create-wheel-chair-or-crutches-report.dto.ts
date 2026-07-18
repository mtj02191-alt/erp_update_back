import {
  IsDateString,
  IsString,
  IsIn,
  IsNumber,
  Min,
  IsOptional,
} from "class-validator";

export class CreateWheelChairOrCrutchesReportDto {
  @IsDateString()
  date: string;

  @IsString()
  @IsIn(["Wheel Chair", "Crutches"])
  type: string;

  @IsString()
  @IsIn(["Male", "Female"])
  gender: string;

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
