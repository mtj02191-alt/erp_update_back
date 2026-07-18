import {
  IsDate,
  IsString,
  IsIn,
  IsNumber,
  Min,
  IsOptional,
} from "class-validator";
import { Type } from "class-transformer";

export class UpdateKasbTrainingReportDto {
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  date?: Date;

  @IsString()
  @IsIn(["expert", "medium_expert", "new trainee"])
  @IsOptional()
  skill_level?: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  quantity?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  addition?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  left?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  total?: number;
}
