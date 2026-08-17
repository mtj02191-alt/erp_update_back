import {
  IsArray,
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  IsDateString,
  ValidateIf,
  IsObject,
} from "class-validator";
import { TEMPLATE_CHANNELS } from "../utils/template-variables.constants";

export class PreviewTemplateDto {
  @IsOptional()
  sample_data?: Record<string, string | number | null>;
}

export class TestSendTemplateDto {
  @IsString()
  @IsIn([...TEMPLATE_CHANNELS])
  channel: string;

  @IsString()
  recipient: string;

  @IsOptional()
  sample_data?: Record<string, string | number | null>;
}

export class ResolveAudienceDto {
  @IsString()
  @IsIn(["manual", "filters"])
  selection_mode: "manual" | "filters";

  @ValidateIf((o) => o.selection_mode === "manual")
  @IsArray()
  @IsInt({ each: true })
  donor_ids?: number[];

  @ValidateIf((o) => o.selection_mode === "filters")
  @IsObject()
  donor_filters?: Record<string, any>;
}

export class SendTemplateBulkDto {
  @IsString()
  @IsIn(["manual", "filters"])
  selection_mode: "manual" | "filters";

  @ValidateIf((o) => o.selection_mode === "manual")
  @IsArray()
  @IsInt({ each: true })
  donor_ids?: number[];

  @ValidateIf((o) => o.selection_mode === "filters")
  @IsObject()
  donor_filters?: Record<string, any>;

  @IsString()
  @IsIn([...TEMPLATE_CHANNELS])
  channel: string;

  @IsOptional()
  @IsDateString()
  scheduled_at?: string | null;

  /** donor_bulk = donors list modal; communication = Communication send page */
  @IsOptional()
  @IsString()
  @IsIn(["donor_bulk", "communication"])
  send_source?: "donor_bulk" | "communication";
}
