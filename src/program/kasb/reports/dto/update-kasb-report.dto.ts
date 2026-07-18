import {
  IsDate,
  IsString,
  IsIn,
  IsNumber,
  Min,
  IsOptional,
} from "class-validator";
import { Type } from "class-transformer";

export class UpdateKasbReportDto {
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  date?: Date;

  @IsString()
  @IsIn(["Tulamba", "Abdul Hakim"])
  @IsOptional()
  center?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  delivery?: number;
}
