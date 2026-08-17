import { IsNotEmpty, IsOptional, IsString } from "class-validator";

export class RescheduleFollowupDto {
  @IsString()
  @IsNotEmpty()
  due_datetime: string;

  @IsOptional()
  @IsString()
  followup_reason?: string;
}
