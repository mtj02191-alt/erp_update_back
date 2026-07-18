import { IsDate, IsNumber, Min, IsOptional } from "class-validator";
import { Type } from "class-transformer";

export class UpdateSewingMachineReportDto {
  @IsDate()
  @Type(() => Date)
  @IsOptional()
  date?: Date;

  @IsNumber()
  @Min(0)
  @IsOptional()
  orphans?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  divorced?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  disable?: number;

  @IsNumber()
  @Min(0)
  @IsOptional()
  indegent?: number;
}
