import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  MaxLength,
  Length,
} from "class-validator";

export class UpdateDistrictDto {
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: "District name must not exceed 100 characters" })
  name?: string;

  @IsString()
  @IsOptional()
  @Length(1, 10, { message: "District code must be 1-10 characters" })
  code?: string;

  @IsNumber()
  @IsOptional()
  region_id?: number;

  @IsNumber()
  @IsOptional()
  country_id?: number;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsString()
  @IsOptional()
  description?: string;
}
