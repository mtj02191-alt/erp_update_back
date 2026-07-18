import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  MaxLength,
  Length,
} from "class-validator";

export class CreateRegionDto {
  @IsString()
  @IsNotEmpty({ message: "Region name is required" })
  @MaxLength(100, { message: "Region name must not exceed 100 characters" })
  name: string;

  @IsString()
  @IsOptional()
  @Length(1, 10, { message: "Region code must be 1-10 characters" })
  code?: string;

  @IsNumber()
  @IsNotEmpty({ message: "Country ID is required" })
  country_id: number;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsString()
  @IsOptional()
  description?: string;
}
