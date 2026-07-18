import {
  IsNumber,
  IsDateString,
  IsOptional,
  IsString,
  IsEnum,
  IsArray,
  IsNotEmpty,
  Min,
} from "class-validator";
import {
  CollectionStatus,
  PaymentMethod,
} from "../entities/donation_box_donation.entity";

export class CreateDonationBoxDonationDto {
  // Required Fields
  @IsNumber()
  @IsNotEmpty({ message: "Donation box ID is required" })
  donation_box_id: number;

  @IsNumber()
  @IsNotEmpty({ message: "Collection amount is required" })
  @Min(0, { message: "Collection amount must be greater than or equal to 0" })
  collection_amount: number;

  @IsDateString()
  @IsNotEmpty({ message: "Collection date is required" })
  collection_date: Date;

  // Optional Fields
  @IsNumber()
  @IsOptional()
  collected_by_id?: number;

  @IsString()
  @IsOptional()
  collector_name?: string;

  @IsEnum(CollectionStatus, {
    message: "Status must be pending, verified, deposited, or cancelled",
  })
  @IsOptional()
  status?: CollectionStatus;

  @IsNumber()
  @IsOptional()
  verified_by_id?: number;

  @IsDateString()
  @IsOptional()
  verified_at?: Date;

  @IsDateString()
  @IsOptional()
  deposit_date?: Date;

  @IsString()
  @IsOptional()
  bank_deposit_slip_no?: string;

  @IsEnum(PaymentMethod, {
    message: "Payment method must be cash, cheque, bank_transfer, or other",
  })
  @IsOptional()
  payment_method?: PaymentMethod;

  @IsString()
  @IsOptional()
  cheque_number?: string;

  @IsString()
  @IsOptional()
  bank_name?: string;

  @IsString()
  @IsOptional()
  bank_account_no?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsString()
  @IsOptional()
  discrepancy_notes?: string;

  @IsArray()
  @IsOptional()
  photo_urls?: string[];

  @IsString()
  @IsOptional()
  receipt_number?: string;
}
