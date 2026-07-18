import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  MinLength,
  IsNotEmpty,
  ValidateIf,
  IsPhoneNumber,
  IsNumber,
} from "class-validator";
import { DonorType } from "../entities/donor.entity";

export class CreateDonorDto {
  // Common fields for all donors
  @IsEnum(DonorType)
  @IsNotEmpty()
  donor_type: DonorType;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  password?: string;

  @IsString()
  @IsNotEmpty()
  phone: string;

  @IsString()
  @IsOptional()
  source?: string;

  @IsString()
  @IsOptional()
  address?: string;

  @IsString()
  @IsOptional()
  city?: string;

  @IsString()
  @IsOptional()
  country?: string;

  @IsString()
  @IsOptional()
  postal_code?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  // Individual Donor fields (required when donor_type = 'individual')
  @ValidateIf((o) => o.donor_type === DonorType.INDIVIDUAL)
  @IsString()
  @IsNotEmpty({ message: "Name is required for individual donors" })
  name?: string;

  @ValidateIf((o) => o.donor_type === DonorType.INDIVIDUAL)
  @IsString()
  @IsOptional()
  first_name?: string;

  @ValidateIf((o) => o.donor_type === DonorType.INDIVIDUAL)
  @IsString()
  @IsOptional()
  last_name?: string;

  // CSR/Corporate Donor fields (required when donor_type = 'csr')
  @ValidateIf((o) => o.donor_type === DonorType.CSR)
  @IsString()
  @IsNotEmpty({ message: "Company name is required for CSR donors" })
  company_name?: string;

  @ValidateIf((o) => o.donor_type === DonorType.CSR)
  @IsString()
  @IsOptional()
  company_registration?: string;

  @ValidateIf((o) => o.donor_type === DonorType.CSR)
  @IsString()
  @IsNotEmpty({ message: "Contact person is required for CSR donors" })
  contact_person?: string;

  @ValidateIf((o) => o.donor_type === DonorType.CSR)
  @IsString()
  @IsOptional()
  designation?: string;

  @ValidateIf((o) => o.donor_type === DonorType.CSR)
  @IsString()
  @IsOptional()
  company_address?: string;

  @ValidateIf((o) => o.donor_type === DonorType.CSR)
  @IsString()
  @IsOptional()
  company_phone?: string;

  @ValidateIf((o) => o.donor_type === DonorType.CSR)
  @IsEmail()
  @IsOptional()
  company_email?: string;

  @IsOptional()
  @IsNumber()
  referrer_user_id?: number;

  @IsNumber()
  assigned_to_user_id?: number;
}
