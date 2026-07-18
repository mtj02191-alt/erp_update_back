import { IsDate, IsNumber, IsNotEmpty, IsOptional } from "class-validator";

export class CreateProcurementsDto {
  @IsDate()
  @IsNotEmpty()
  date: Date;

  @IsNumber()
  @IsNotEmpty()
  totalGeneratedPOs: number;

  @IsNumber()
  @IsNotEmpty()
  pendingPOs: number;

  @IsNumber()
  @IsNotEmpty()
  fulfilledPOs: number;

  @IsNumber()
  @IsNotEmpty()
  totalGeneratedPIs: number;

  @IsNumber()
  @IsNotEmpty()
  totalPaidAmount: number;

  @IsNumber()
  @IsNotEmpty()
  unpaidAmount: number;

  @IsNumber()
  @IsNotEmpty()
  unpaidPIs: number;

  @IsNumber()
  @IsNotEmpty()
  tenders: number;

  @IsNumber()
  @IsOptional()
  storeId?: number;
}
