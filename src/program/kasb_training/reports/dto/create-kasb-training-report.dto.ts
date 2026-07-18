import {
  IsDateString,
  IsString,
  IsIn,
  IsNumber,
  Min,
  IsOptional,
} from "class-validator";

export class CreateKasbTrainingReportDto {
  @IsDateString()
  date: string;

  @IsString()
  @IsIn(["expert", "medium_expert", "new trainee"])
  skill_level: string;

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
