import {
  IsBoolean,
  IsInt,
  IsOptional,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export class CampaignChannelTemplateDto {
  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  enabled?: boolean;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  email_template_id?: number | null;

  @IsOptional()
  @IsInt()
  @Type(() => Number)
  whatsapp_template_id?: number | null;
}

export class CampaignCommunicationTemplatesDto {
  @IsOptional()
  @ValidateNested()
  @Type(() => CampaignChannelTemplateDto)
  marketing?: CampaignChannelTemplateDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CampaignChannelTemplateDto)
  thanks?: CampaignChannelTemplateDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CampaignChannelTemplateDto)
  reminder?: CampaignChannelTemplateDto;

  @IsOptional()
  @ValidateNested()
  @Type(() => CampaignChannelTemplateDto)
  payment_link?: CampaignChannelTemplateDto;
}
