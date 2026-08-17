import { IsInt, Min } from "class-validator";
import { Type } from "class-transformer";

export class ManualRecurringPledgeLineDto {
  @IsInt()
  @Type(() => Number)
  campaign_item_id: number;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity: number;
}
