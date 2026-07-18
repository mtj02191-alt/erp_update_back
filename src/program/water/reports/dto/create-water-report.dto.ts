import {
  IsDateString,
  IsString,
  IsIn,
  IsNumber,
  Min,
  IsOptional,
} from "class-validator";

export class CreateWaterReportDto {
  @IsDateString()
  date: string;

  @IsString()
  @IsIn(["Survey", "Installation", "Monitoring"])
  activity: string;

  @IsString()
  @IsIn([
    "Hand Pump Indoor",
    "Hand Pump Outdoor",
    "Water Motor Indoor",
    "Water Motor Outdoor",
    "Affrideve HP",
    "WF PLANT",
  ])
  system: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  quantity?: number;
}
