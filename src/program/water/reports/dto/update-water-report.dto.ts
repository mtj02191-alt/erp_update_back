import {
  IsDate,
  IsString,
  IsIn,
  IsNumber,
  Min,
  IsOptional,
} from "class-validator";
import { Type } from "class-transformer";

export class UpdateWaterReportDto {
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  date?: Date;

  @IsString()
  @IsIn(["Survey", "Installation", "Monitoring"])
  @IsOptional()
  activity?: string;

  @IsString()
  @IsIn([
    "Hand Pump Indoor",
    "Hand Pump Outdoor",
    "Water Motor Indoor",
    "Water Motor Outdoor",
    "Affrideve HP",
    "WF PLANT",
  ])
  @IsOptional()
  system?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  quantity?: number;
}
