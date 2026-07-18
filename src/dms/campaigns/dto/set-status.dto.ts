import { IsEnum } from "class-validator";
import { CampaignStatus } from "../entities/campaign.entity";

export class SetCampaignStatusDto {
  @IsEnum(CampaignStatus)
  status: CampaignStatus;
}
