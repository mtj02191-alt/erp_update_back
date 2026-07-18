import { IsDate, IsNumber, IsObject, IsOptional, Min } from "class-validator";
import { Type } from "class-transformer";
import { User } from "src/users/user.entity";

export class CreateProcurementsDailyReportDto {
  @IsDate()
  @Type(() => Date)
  date: Date;

  @IsNumber()
  @Min(0)
  total_generated_pos: number;

  @IsNumber()
  @Min(0)
  pending_pos: number;

  @IsNumber()
  @Min(0)
  fulfilled_pos: number;

  @IsNumber()
  @Min(0)
  total_generated_pis: number;

  @IsNumber()
  @Min(0)
  total_paid_amount: number;

  @IsNumber()
  @Min(0)
  unpaid_amount: number;

  @IsNumber()
  @Min(0)
  unpaid_pis: number;

  @IsNumber()
  @Min(0)
  tenders: number;

  @IsOptional()
  @IsObject()
  created_by: User;
}
