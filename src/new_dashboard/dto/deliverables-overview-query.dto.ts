import { IsOptional, Matches } from "class-validator";

/** Optional inclusive date range (YYYY-MM-DD) applied per report table (`report_date` or `date`). */
export class DeliverablesOverviewQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "from must be YYYY-MM-DD" })
  from?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "to must be YYYY-MM-DD" })
  to?: string;
}
