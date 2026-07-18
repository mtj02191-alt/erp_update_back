import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  MaxLength,
  Length,
  IsDecimal,
} from "class-validator";

export class CreateCityDto {
  @IsString()
  @IsNotEmpty({ message: "City name is required" })
  @MaxLength(100, { message: "City name must not exceed 100 characters" })
  name: string;

  @IsString()
  @IsOptional()
  @Length(1, 10, { message: "City code must be 1-10 characters" })
  code?: string;

  @IsNumber()
  @IsNotEmpty({ message: "Tehsil ID is required" })
  tehsil_id: number;

  @IsNumber()
  @IsNotEmpty({ message: "District ID is required" })
  district_id: number;

  @IsNumber()
  @IsNotEmpty({ message: "Region ID is required" })
  region_id: number;

  @IsNumber()
  @IsNotEmpty({ message: "Country ID is required" })
  country_id: number;

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
