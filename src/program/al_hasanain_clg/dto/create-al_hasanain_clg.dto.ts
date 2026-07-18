import { IsInt, IsNumber, Max, Min } from "class-validator";

export class CreateAlHasanainClgDto {
  @IsInt()
  @Min(0)
  total_students: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  attendance_percent: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  dropout_rate: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  pass_rate: number;

  @IsNumber()
  @Min(0)
  fee_collection: number;

  @IsInt()
  @Min(0)
  active_teachers: number;
}
