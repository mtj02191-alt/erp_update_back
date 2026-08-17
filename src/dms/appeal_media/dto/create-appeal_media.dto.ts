import {
  IsString,
  IsOptional,
  IsNumber,
  IsEnum,
  MaxLength,
} from "class-validator";
import { Type } from "class-transformer";
import { AppealMediaType } from "../entities/appeal_media.entity";

export class CreateAppealMediaDto {
  @IsNumber()
  @Type(() => Number)
  appeal_id: number;

  @IsString()
  url: string;

  @IsOptional()
  @IsEnum(AppealMediaType)
  media_type?: AppealMediaType;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  caption?: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  sort_order?: number;
}
