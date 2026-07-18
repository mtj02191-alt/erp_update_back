import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  Length,
  MaxLength,
} from "class-validator";

export class CreateCountryDto {
  @IsString()
  @IsNotEmpty({ message: "Country name is required" })
  @MaxLength(100, { message: "Country name must not exceed 100 characters" })
  name: string;

  @IsString()
  @IsNotEmpty({ message: "Country code is required" })
  @Length(2, 3, { message: "Country code must be 2-3 characters" })
  code: string;

  @IsString()
  @IsNotEmpty({ message: "Currency is required" })
  @Length(3, 3, { message: "Currency must be 3 characters" })
  currency: string;

  @IsString()
  @IsOptional()
  @Length(1, 2, { message: "Currency symbol must be 1-2 characters" })
  currency_symbol?: string;

  @IsString()
  @IsOptional()
  @Length(1, 10, { message: "Phone code must be 1-10 characters" })
  phone_code?: string;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsString()
  @IsOptional()
  description?: string;
}
