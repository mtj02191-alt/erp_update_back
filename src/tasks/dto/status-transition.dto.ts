import { IsEnum, IsOptional, IsString } from "class-validator";
import { TaskStatus } from "../entities/task.entity";

export class StatusTransitionDto {
  @IsEnum(TaskStatus)
  status: TaskStatus;

  @IsOptional()
  @IsString()
  notes?: string;
}
