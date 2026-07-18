import {
  IsEnum,
  IsOptional,
  IsDateString,
  IsInt,
  IsString,
} from "class-validator";
import { Transform } from "class-transformer";
import { Department } from "../../users/user.entity";
import {
  TaskPriority,
  TaskWorkflowType,
  TaskType,
} from "../../tasks/entities/task.entity";

export class ConvertToTaskDto {
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

  @IsDateString()
  @IsOptional()
  task_due_date?: string;

  @Transform(({ value }) => 
    Array.isArray(value) 
      ? value.map((id) => Number(id)).filter((id) => !isNaN(id)) 
      : value
  )
  @IsInt({ each: true })
  @IsOptional()
  assigned_users?: number[];

  @IsString({ each: true })
  @IsOptional()
  mov_items?: string[];
}
