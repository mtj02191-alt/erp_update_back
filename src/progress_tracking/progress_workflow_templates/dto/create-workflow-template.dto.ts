import {
  IsBoolean,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
} from "class-validator";

export class CreateWorkflowTemplateDto {
  @IsString()
  name: string;

  @IsString()
  code: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsNumber()
  program_id?: number | null;

  /** Parent template id (nullable) */
  @IsOptional()
  @IsInt()
  parent_id?: number | null;

  /** Target/goal amount for this template */
  @IsOptional()
  @IsNumber()
  target_amount?: number | null;

  /** Enable batch allocation for donations using this template */
  @IsOptional()
  @IsBoolean()
  is_batchable?: boolean;

  /** Total parts/shares in each batch (e.g., 7 for cow) */
  @IsOptional()
  @IsInt()
  batch_parts?: number | null;

  /** Amount per part/share */
  @IsOptional()
  @IsNumber()
  batch_part_amount?: number | null;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}
