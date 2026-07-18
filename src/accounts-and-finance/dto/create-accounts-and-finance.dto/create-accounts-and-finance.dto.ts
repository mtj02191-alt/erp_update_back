import { IsDate, IsNumber, IsNotEmpty } from "class-validator";

export class CreateAccountsAndFinanceDto {
  @IsDate()
  @IsNotEmpty()
  date: Date;

  @IsNumber()
  @IsNotEmpty()
  dailyInflow: number;

  @IsNumber()
  @IsNotEmpty()
  dailyOutflow: number;

  @IsNumber()
  @IsNotEmpty()
  pendingPayable: number;

  @IsNumber()
  @IsNotEmpty()
  pettyCash: number;

  @IsNumber()
  @IsNotEmpty()
  available_funds: number;

  @IsNumber()
  @IsNotEmpty()
  tax_late_payments: number;

  @IsNumber()
  @IsNotEmpty()
  payable_reports: number;

  @IsNumber()
  @IsNotEmpty()
  restricted_funds_reports: number;

  @IsNumber()
  @IsNotEmpty()
  payment_commitment_party_vise: number;
}
