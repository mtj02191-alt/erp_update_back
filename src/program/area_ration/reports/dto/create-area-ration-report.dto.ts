import { IsDate, IsNumber, IsString, Min, IsNotEmpty } from "class-validator";
import { Type } from "class-transformer";

export class CreateAreaRationReportDto {
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  report_date: Date;

  @IsString()
  @IsNotEmpty()
  province: string;

  @IsString()
  @IsNotEmpty()
  district: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  quantity: number;
}
