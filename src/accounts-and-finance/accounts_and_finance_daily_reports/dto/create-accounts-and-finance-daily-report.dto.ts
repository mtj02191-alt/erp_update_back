import { IsDate, IsNumber, IsNotEmpty } from "class-validator";

export class CreateAccountsAndFinanceDailyReportDto {
  @IsDate()
  @IsNotEmpty()
  date: Date;

  @IsNumber()
  @IsNotEmpty()
  daily_inflow: number;

  @IsNumber()
  @IsNotEmpty()
  daily_outflow: number;

  @IsNumber()
  @IsNotEmpty()
  pending_payable: number;

  @IsNumber()
  @IsNotEmpty()
  petty_cash: number;

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
