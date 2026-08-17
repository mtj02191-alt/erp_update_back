import {
  IsString,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  IsDateString,
  IsNumber,
  IsArray,
} from "class-validator";
import { Transform } from "class-transformer";
import {
  BoxType,
  BoxStatus,
  CollectionFrequency,
} from "../entities/donation-box.entity";

export class CreateDonationBoxDto {
  // Box Identification (optional — both may be null)
  @Transform(({ value }) => {
    if (value === "" || value === undefined || value === null) return null;
    const s = String(value).trim();
    return s || null;
  })
  @IsString()
  @IsOptional()
  box_id_no?: string | null;

  @Transform(({ value }) => {
    if (value === "" || value === undefined || value === null) return null;
    const s = String(value).trim();
    return s || null;
  })
  @IsString()
  @IsOptional()
  key_no?: string | null;

  // Location Details — route is optional
  @Transform(({ value }) => {
    if (value === "" || value === undefined || value === null) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  })
  @IsNumber()
  @IsOptional()
  route_id?: number | null;

  @Transform(({ value }) => {
    if (value === "" || value === undefined || value === null) return null;
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  })
  @IsNumber()
  @IsOptional()
  city_id?: number | null;

  // Shop Details (Required shop_name)
  @IsString()
  @IsNotEmpty({ message: "Shop name is required" })
  shop_name: string;

  @IsString()
  @IsOptional()
  shopkeeper?: string;

  @IsString()
  @IsOptional()
  cell_no?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  landmark_marketplace?: string;

  // Box Details
  @IsEnum(BoxType, {
    message: "Box type must be small, medium, large, or custom",
  })
  @IsNotEmpty({ message: "Box type is required" })
  box_type: BoxType;

  @IsEnum(BoxStatus, {
    message: "Status must be active, inactive, maintenance, or retired",
  })
  @IsNotEmpty({ message: "Status is required" })
  status: BoxStatus;

  @IsEnum(CollectionFrequency, {
    message:
      "Frequency must be daily, weekly, bi-weekly, monthly, quarterly, or as-needed",
  })
  @IsOptional()
  frequency?: CollectionFrequency;

  @IsDateString()
  @IsNotEmpty({ message: "Active since date is required" })
  active_since: Date;

  @IsString()
  @IsOptional()
  notes?: string;

  // User Assignment (Optional)
  @IsArray()
  @IsNumber({}, { each: true })
  @IsOptional()
  assigned_user_ids?: number[];
}
