import { IsBoolean, IsOptional } from "class-validator";

export class UpdateTrackerDto {
  @IsOptional()
  @IsBoolean()
  donor_visible?: boolean;
}
