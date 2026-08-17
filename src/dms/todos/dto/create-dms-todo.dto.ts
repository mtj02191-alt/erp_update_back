import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  ValidateIf,
} from "class-validator";
import {
  DmsTodoPriority,
  DmsTodoRecurrenceEndType,
  DmsTodoRecurrenceRule,
  DmsTodoRelatedType,
} from "../entities/dms-todo.entity";

export class CreateDmsTodoDto {
  @IsString()
  @IsNotEmpty({ message: "Title is required" })
  @MaxLength(255)
  title: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsEnum(DmsTodoPriority)
  @IsOptional()
  priority?: DmsTodoPriority;

  @IsDateString()
  @IsOptional()
  due_date?: string;

  @IsInt()
  @IsOptional()
  assigned_to_id?: number;

  @IsEnum(DmsTodoRelatedType)
  @IsOptional()
  related_type?: DmsTodoRelatedType;

  @ValidateIf((o) => o.related_type && o.related_type !== DmsTodoRelatedType.NONE)
  @IsInt()
  @IsOptional()
  related_id?: number;

  @IsObject()
  @IsOptional()
  related_meta?: Record<string, unknown>;

  @IsBoolean()
  @IsOptional()
  is_recurring?: boolean;

  @ValidateIf((o) => o.is_recurring === true)
  @IsEnum(DmsTodoRecurrenceRule, {
    message:
      "recurrence_rule must be daily, weekly, bi_weekly, monthly, quarterly, or annually",
  })
  @IsNotEmpty({ message: "recurrence_rule is required when is_recurring is true" })
  recurrence_rule?: DmsTodoRecurrenceRule;

  @IsEnum(DmsTodoRecurrenceEndType)
  @IsOptional()
  recurrence_end_type?: DmsTodoRecurrenceEndType;

  @ValidateIf(
    (o) => o.recurrence_end_type === DmsTodoRecurrenceEndType.ON_DATE,
  )
  @IsDateString()
  @IsOptional()
  recurrence_end_date?: string;

  @ValidateIf(
    (o) =>
      o.recurrence_end_type === DmsTodoRecurrenceEndType.AFTER_OCCURRENCES,
  )
  @IsInt()
  @Min(1)
  @IsOptional()
  recurrence_end_occurrences?: number;
}
