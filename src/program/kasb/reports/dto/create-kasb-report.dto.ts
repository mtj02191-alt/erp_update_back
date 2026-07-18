import {
  IsDateString,
  IsString,
  IsIn,
  IsNumber,
  Min,
  IsOptional,
} from "class-validator";

export class CreateKasbReportDto {
  @IsDateString()
  date: string;

  @IsString()
  @IsIn(["Tulamba", "Abdul Hakim"])
  center: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  delivery?: number;
}
