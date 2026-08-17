import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from "class-validator";
import {
  DmsTodoPriority,
  DmsTodoRecurrenceEndType,
  DmsTodoRecurrenceRule,
  DmsTodoRelatedType,
  DmsTodoStatus,
} from "../entities/dms-todo.entity";

export class UpdateDmsTodoDto {
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @IsString()
  @IsOptional()
  notes?: string | null;

  @IsEnum(DmsTodoPriority)
  @IsOptional()
  priority?: DmsTodoPriority;

  @IsEnum(DmsTodoStatus)
  @IsOptional()
  status?: DmsTodoStatus;

  @IsDateString()
  @IsOptional()
  due_date?: string | null;

  @IsInt()
  @IsOptional()
  assigned_to_id?: number;

  @IsEnum(DmsTodoRelatedType)
  @IsOptional()
  related_type?: DmsTodoRelatedType;

  @IsInt()
  @IsOptional()
  related_id?: number | null;

  @IsObject()
  @IsOptional()
  related_meta?: Record<string, unknown> | null;

  @IsBoolean()
  @IsOptional()
  is_recurring?: boolean;

  @IsEnum(DmsTodoRecurrenceRule)
  @IsOptional()
  recurrence_rule?: DmsTodoRecurrenceRule | null;

  @IsEnum(DmsTodoRecurrenceEndType)
  @IsOptional()
  recurrence_end_type?: DmsTodoRecurrenceEndType | null;

  @IsDateString()
  @IsOptional()
  recurrence_end_date?: string | null;

  @IsInt()
  @Min(1)
  @IsOptional()
  recurrence_end_occurrences?: number | null;
}
