import { IsOptional, Matches } from "class-validator";

/** Optional inclusive date range on `program_application_reports.report_date` (YYYY-MM-DD). */
export class ProgramApplicationOverviewQueryDto {
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "from must be YYYY-MM-DD" })
  from?: string;

  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: "to must be YYYY-MM-DD" })
  to?: string;
}
