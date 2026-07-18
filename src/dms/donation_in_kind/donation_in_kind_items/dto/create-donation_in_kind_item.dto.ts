import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsDateString,
  Min,
  MaxLength,
  IsNotEmpty,
} from "class-validator";
import { ItemCategory } from "../entities/donation_in_kind_item.entity";

export class CreateDonationInKindItemDto {
  // Required Fields
  @IsString()
  @IsNotEmpty({ message: "Item code is required" })
  @MaxLength(50, { message: "Item code must not exceed 50 characters" })
  item_code: string;

  @IsString()
  @IsNotEmpty({ message: "Item name is required" })
  @MaxLength(255, { message: "Item name must not exceed 255 characters" })
  name: string;

  @IsEnum(ItemCategory, {
    message:
      "Category must be one of: clothing, food, medical, educational, electronics, furniture, books, toys, household, other",
  })
  @IsNotEmpty({ message: "Category is required" })
  category: ItemCategory;

  // Optional Fields
  @IsString()
  @IsOptional()
  description?: string;

  @IsNumber()
  @IsOptional()
  @Min(1, { message: "Quantity must be at least 1" })
  quantity?: number;

  @IsNumber()
  @IsOptional()
  @Min(0, { message: "Estimated value must be greater than or equal to 0" })
  estimated_value?: number;

  @IsString()
  @IsOptional()
  @MaxLength(100, { message: "Brand must not exceed 100 characters" })
  brand?: string;

  @IsString()
  @IsOptional()
  @MaxLength(100, { message: "Model must not exceed 100 characters" })
  model?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50, { message: "Size must not exceed 50 characters" })
  size?: string;

  @IsString()
  @IsOptional()
  @MaxLength(50, { message: "Color must not exceed 50 characters" })
  color?: string;

  // Collection Details
  @IsDateString()
  @IsOptional()
  collection_date?: Date;

  @IsString()
  @IsOptional()
  @MaxLength(255, {
    message: "Collection location must not exceed 255 characters",
  })
  collection_location?: string;

  // Additional Information
  @IsString()
  @IsOptional()
  notes?: string;

  // Store/Shop ID for automatic purchase creation
  @IsNumber()
  @IsOptional()
  store_id?: number;
}
