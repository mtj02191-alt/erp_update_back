import { IsOptional, IsString, IsEnum, IsBoolean } from "class-validator";
import { Type } from "class-transformer";
import { AppealCategory, AppealStatus } from "../entities/appeal.entity";

export class AppealFiltersDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(AppealStatus)
  status?: AppealStatus;

  @IsOptional()
  @IsEnum(AppealCategory)
  category?: AppealCategory;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_featured?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  is_urgent?: boolean;

  @IsOptional()
  @IsBoolean()
  @Type(() => Boolean)
  include_archived?: boolean;
}
