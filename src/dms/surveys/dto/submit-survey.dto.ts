import {
  IsInt,
  IsOptional,
  IsString,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsIn,
} from "class-validator";
import { Type } from "class-transformer";

export class SurveyAnswerDto {
  @IsInt()
  question_id: number;

  @IsOptional()
  @IsString()
  answer_option_key?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  answer_option_keys?: string[];

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  answer_rating?: number;

  @IsOptional()
  @IsString()
  answer_text?: string;
}

export class SubmitSurveyDto {
  @IsOptional()
  @IsString()
  device_id?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SurveyAnswerDto)
  answers: SurveyAnswerDto[];
}
