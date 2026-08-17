import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsArray,
  IsIn,
} from "class-validator";
import {
  TEMPLATE_CHANNELS,
  TEMPLATE_PURPOSES,
  TEMPLATE_STATUSES,
  TEMPLATE_VARIABLE_KEYS,
} from "../utils/template-variables.constants";

export class CreateEmailTemplateDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  subject?: string | null;

  @IsString()
  @IsNotEmpty()
  body: string;

  @IsString()
  @IsOptional()
  description?: string | null;

  @IsString()
  @IsOptional()
  category?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsArray()
  @IsOptional()
  @IsIn([...TEMPLATE_CHANNELS], { each: true })
  channels?: string[] | null;

  @IsArray()
  @IsOptional()
  @IsIn([...TEMPLATE_PURPOSES], { each: true })
  purposes?: string[] | null;

  @IsArray()
  @IsOptional()
  campaign_ids?: string[] | null;

  @IsArray()
  @IsOptional()
  appeal_ids?: string[] | null;

  @IsArray()
  @IsOptional()
  event_ids?: string[] | null;

  @IsString()
  @IsOptional()
  cta_button_text?: string | null;

  @IsString()
  @IsOptional()
  cta_url?: string | null;

  @IsArray()
  @IsOptional()
  @IsIn([...TEMPLATE_VARIABLE_KEYS], { each: true })
  variables?: string[] | null;

  @IsString()
  @IsOptional()
  @IsIn([...TEMPLATE_STATUSES])
  status?: string;
}
