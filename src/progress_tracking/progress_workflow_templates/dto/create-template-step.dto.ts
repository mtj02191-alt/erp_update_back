import {
  IsBoolean,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from "class-validator";

export class CreateTemplateStepDto {
  @IsString()
  step_key: string;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsNumber()
  @Min(1)
  step_order: number;

  @IsOptional()
  @IsBoolean()
  is_required?: boolean;

  @IsOptional()
  @IsBoolean()
  allow_evidence?: boolean;

  @IsOptional()
  @IsBoolean()
  allow_notes?: boolean;

  @IsOptional()
  @IsBoolean()
  allow_metadata?: boolean;

  @IsOptional()
  @IsObject()
  metadata_schema?: Record<string, any> | null;

  @IsOptional()
  @IsBoolean()
  notify_donor_on_complete?: boolean;
}
