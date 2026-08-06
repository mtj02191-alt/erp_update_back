import { IsOptional, IsString, IsInt, Min, IsEnum, IsDateString, IsIn } from "class-validator";
import { Type } from "class-transformer";
import { CeoNoteCategory, CeoNoteStatus } from "../entities/ceo-note.entity";
import { Department } from "../../users/user.entity";

export class CeoNotesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  pageSize?: number = 10;

  @IsOptional()
  @IsString()
  sortField?: string;

  @IsOptional()
  @IsString()
  sortOrder?: "ASC" | "DESC" = "DESC";

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(CeoNoteCategory)
  category?: CeoNoteCategory;

  @IsOptional()
  @IsEnum(CeoNoteStatus)
  status?: CeoNoteStatus;

  @IsOptional()
  @IsEnum(Department)
  department?: Department;

  @IsOptional()
  @IsIn(["low", "medium", "high", "critical"])
  priority?: "low" | "medium" | "high" | "critical";

  @IsOptional()
  @IsDateString()
  start_date?: string;

  @IsOptional()
  @IsDateString()
  end_date?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  assigned_user_id?: number;
}
