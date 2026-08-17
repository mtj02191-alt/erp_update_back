import { IsInt, Max, Min } from "class-validator";

export class CreateTaskDueReminderDto {
  @IsInt()
  @Min(0)
  @Max(365)
  offset_days: number;

  @IsInt()
  @Min(0)
  @Max(23)
  remind_at_hour: number;
}
