import { IsNumber, Min, Max } from "class-validator";
import { Type } from "class-transformer";

export class GeneratePassesQueryDto {
  @IsNumber()
  @Min(1)
  @Max(1000)
  @Type(() => Number)
  count: number;
}
