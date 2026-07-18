import { IsDate, IsNumber, IsString, Min, IsNotEmpty } from "class-validator";
import { Type } from "class-transformer";

export class CreateTreePlantationReportDto {
  @IsDate()
  @Type(() => Date)
  @IsNotEmpty()
  report_date: Date;

  @IsString()
  @IsNotEmpty()
  school_name: string;

  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  plants: number;
}
