import {
  IsString,
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

export class UpdateRouteDto {
  @IsString()
  @IsOptional()
  @MaxLength(100, { message: "Route name must not exceed 100 characters" })
  name?: string;

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
  @IsOptional()
  city_ids?: number[];

  @IsNumber()
  @IsOptional()
  region_id?: number;

  @IsNumber()
  @IsOptional()
  country_id?: number;

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
