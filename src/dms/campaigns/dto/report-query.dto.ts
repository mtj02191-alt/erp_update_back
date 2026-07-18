import { IsOptional, IsDateString } from "class-validator";

export class CampaignReportQueryDto {
  @IsOptional()
  @IsDateString()
  from?: string;

  @IsOptional()
  @IsDateString()
  to?: string;
}
