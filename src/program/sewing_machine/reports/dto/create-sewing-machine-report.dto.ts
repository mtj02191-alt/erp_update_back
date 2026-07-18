import { IsDateString, IsNumber, Min, IsOptional } from "class-validator";

export class CreateSewingMachineReportDto {
  @IsDateString()
  date: string;

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
