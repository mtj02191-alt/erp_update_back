import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsBoolean,
  IsNumber,
  IsEnum,
  IsArray,
  MaxLength,
  Length,
  IsDecimal,
} from "class-validator";
import { RouteType } from "../entities/route.entity";

export class CreateRouteDto {
  @IsString()
  @IsNotEmpty({ message: "Route name is required" })
  @MaxLength(100, { message: "Route name must not exceed 100 characters" })
  name: string;

  @IsString()
  @IsOptional()
  @Length(1, 20, { message: "Route code must be 1-20 characters" })
  code?: string;

  @IsEnum(RouteType, {
    message:
      "Route type must be one of: main, secondary, local, highway, street, other",
  })
  @IsOptional()
  route_type?: RouteType;

  @IsArray()
  @IsNumber({}, { each: true })
  @IsNotEmpty({ message: "City IDs are required" })
  city_ids: number[];

  @IsNumber()
  @IsNotEmpty({ message: "Region ID is required" })
  region_id: number;

  @IsNumber()
  @IsNotEmpty({ message: "Country ID is required" })
  country_id: number;

  @IsDecimal({ decimal_digits: "2" })
  @IsOptional()
  distance_km?: number;

  @IsBoolean()
  @IsOptional()
  is_active?: boolean;

  @IsString()
  @IsOptional()
  description?: string;
}
