import { PartialType } from "@nestjs/mapped-types";
import { CreateCampaignDto } from "./create-campaign.dto";
import { IsOptional, IsDateString, ValidateIf } from "class-validator";

export class UpdateCampaignDto extends PartialType(CreateCampaignDto) {}
