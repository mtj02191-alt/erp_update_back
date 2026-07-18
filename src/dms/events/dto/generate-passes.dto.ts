import { IsOptional, IsNumber, Min, Max } from "class-validator";
import { Type } from "class-transformer";

export class GeneratePassesQueryDto {
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(1000)
  @Type(() => Number)
  count?: number = 1;
}
