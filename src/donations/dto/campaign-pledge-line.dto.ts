import { IsInt, Min } from "class-validator";
import { Type } from "class-transformer";

/** Website campaign checkout line for manual recurring enrollment. */
export class CampaignPledgeLineDto {
  @IsInt()
  @Type(() => Number)
  campaign_item_id: number;

  @IsInt()
  @Min(1)
  @Type(() => Number)
  quantity: number;
}
