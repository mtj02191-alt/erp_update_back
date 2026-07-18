import { IsBoolean, IsEnum, IsOptional, IsString } from "class-validator";
import { ProgressStatus } from "../../common/progress-tracking.enum";

export class UpdateTrackerStepStatusDto {
  @IsOptional()
  @IsEnum(ProgressStatus)
  status?: ProgressStatus;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsBoolean()
  donor_visible?: boolean;

  @IsOptional()
  @IsBoolean()
  donor_notified?: boolean;
}
