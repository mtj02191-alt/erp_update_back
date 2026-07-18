import {
  IsString,
  IsOptional,
  IsBoolean,
  IsNumber,
  MaxLength,
  Length,
} from "class-validator";

export class UpdateTehsilDto {
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: "Tehsil name must not exceed 100 characters" })
  name?: string;

  @IsString()
  @IsOptional()
  @Length(1, 10, { message: "Tehsil code must be 1-10 characters" })
  code?: string;

  @IsNumber()
  @IsOptional()
  district_id?: number;

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
