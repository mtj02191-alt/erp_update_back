import { IsArray, ArrayNotEmpty, IsOptional, IsString, IsEnum, IsInt, ValidateNested } from "class-validator";
import { Type } from "class-transformer";
import { Department } from "../../users/user.entity";
import { TaskPriority, TaskWorkflowType, TaskType } from "../../tasks/entities/task.entity";

export class BulkConvertToTaskDto {
  @IsArray()
  @ArrayNotEmpty()
  @Type(() => Number)
  @IsInt({ each: true })
  note_ids: number[];

  @IsString()
  @IsOptional()
  task_title?: string;

  @IsString()
  @IsOptional()
  task_description?: string;

  @IsEnum(Department)
  @IsOptional()
  task_department?: Department;

  @IsEnum(TaskPriority)
  @IsOptional()
  task_priority?: TaskPriority;

  @IsString()
  @IsOptional()
  task_due_date?: string;

  @IsArray()
  @IsOptional()
  @Type(() => Number)
  @IsInt({ each: true })
  assigned_users?: number[];

  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  mov_items?: string[];
}
