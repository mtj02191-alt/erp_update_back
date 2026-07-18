import { IsDate, IsNotEmpty } from "class-validator";
import { Type } from "class-transformer";

export class AdminReportDto {
  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  fromDate: Date;

  @IsNotEmpty()
  @IsDate()
  @Type(() => Date)
  toDate: Date;
}
