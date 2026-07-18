import {
  IsString,
  IsEnum,
  IsOptional,
  IsBoolean,
  IsInt,
  IsArray,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";
import { QuestionType } from "../entities/survey_question.entity";

export class SurveyQuestionOptionDto {
  @IsString()
  option_key: string;

  @IsString()
  option_text: string;
}

export class AddQuestionDto {
  @IsString()
  question_text: string;

  @IsEnum(QuestionType)
  question_type: QuestionType;

  @IsOptional()
  @IsBoolean()
  is_required?: boolean;

  @IsOptional()
  @IsInt()
  question_no?: number;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SurveyQuestionOptionDto)
  options?: SurveyQuestionOptionDto[];
}

export class AddQuestionsBulkDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AddQuestionDto)
  questions: AddQuestionDto[];
}
