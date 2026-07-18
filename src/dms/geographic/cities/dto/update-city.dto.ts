import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  MaxLength,
  Length,
  IsDecimal,
} from "class-validator";

export class UpdateCityDto {
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: "City name must not exceed 100 characters" })
  name?: string;

  @IsString()
  @IsOptional()
  @Length(1, 10, { message: "City code must be 1-10 characters" })
  code?: string;

  @IsNumber()
  @IsOptional()
  tehsil_id?: number;

  @IsNumber()
  @IsOptional()
  district_id?: number;

  @IsNumber()
  @IsOptional()
  region_id?: number;

  @IsNumber()
  @IsOptional()
  country_id?: number;

  @IsDecimal({ decimal_digits: "7" })
  @IsOptional()
  latitude?: number;

  @IsDecimal({ decimal_digits: "7" })
  @IsOptional()
  longitude?: number;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsString()
  @IsOptional()
  description?: string;
}
