import { IsDate, IsNumber, IsNotEmpty, IsOptional } from "class-validator";
import { Transform } from "class-transformer";

export class CreateStoreDailyReportDto {
  @IsDate()
  @IsNotEmpty()
  @Transform(({ value }) => new Date(value))
  date: Date;

  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => parseInt(value))
  generated_demands: number;

  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => parseInt(value))
  pending_demands: number;

  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => parseInt(value))
  generated_grn: number;

  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => parseInt(value))
  pending_grn: number;

  @IsNumber()
  @IsNotEmpty()
  @Transform(({ value }) => parseInt(value))
  rejected_demands: number;
}
