import {
  IsString,
  IsOptional,
  IsNumber,
  MaxLength,
} from "class-validator";
import { Type } from "class-transformer";

export class CreateAppealsBenificiaryDto {
  @IsString()
  @MaxLength(200)
  name: string;

  @IsOptional()
  @IsNumber()
  @Type(() => Number)
  age?: number;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  location?: string;

  @IsOptional()
  @IsString()
  bio?: string;

  @IsOptional()
  @IsString()
  profile_image_url?: string;
}
