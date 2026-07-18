import { IsOptional, IsDateString } from "class-validator";

export class EventDonationsReportQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
