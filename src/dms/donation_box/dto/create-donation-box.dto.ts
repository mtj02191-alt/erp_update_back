import {
  IsString,
  IsOptional,
  IsEnum,
  IsNotEmpty,
  IsDateString,
  IsPhoneNumber,
  IsNumber,
  IsArray,
} from "class-validator";
import {
  BoxType,
  BoxStatus,
  CollectionFrequency,
} from "../entities/donation-box.entity";

export class CreateDonationBoxDto {
  // Box Identification (Required)

  @IsString()
  @IsOptional()
  key_no?: string;

  // Location Details (Required) - Geographic Reference
  @IsNumber()
  @IsNotEmpty({ message: "Route ID is required" })
  route_id: number;

  @IsNumber()
  @IsOptional()
  city_id?: number;

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

  // Reference & Dates
  @IsString()
  @IsOptional()
  frd_officer_reference?: string;

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
