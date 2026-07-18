import { IsString, IsOptional, IsArray, ValidateNested } from "class-validator";
import { Type } from "class-transformer";

class ActionItemDto {
  @IsString()
  text: string;

  @IsOptional()
  assigned_to_id?: number;

  @IsOptional()
  due_date?: string;
}

class PendingItemDto {
  @IsString()
  text: string;
}

export class CreateProjectCommandSheetDto {
  @IsString()
  project_name: string;

  @IsString()
  @IsOptional()
  project_details?: string;

  @IsString()
  @IsOptional()
  discussions?: string;

  @IsString()
  @IsOptional()
  decisions?: string;

  @IsString()
  @IsOptional()
  meeting_notes?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PendingItemDto)
  @IsOptional()
  pending_items?: PendingItemDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ActionItemDto)
  @IsOptional()
  action_items?: ActionItemDto[];

  @IsString()
  @IsOptional()
  next_steps?: string;

  @IsString()
  @IsOptional()
  results?: string;
}
