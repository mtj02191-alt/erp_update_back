import { IsInt, IsOptional } from "class-validator";

export class AllocateTrackerPartsDto {
  @IsOptional()
  @IsInt()
  parts_requested?: number;
}

