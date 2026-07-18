import {
  IsString,
  IsEmail,
  IsOptional,
  IsBoolean,
  IsArray,
  IsDateString,
} from "class-validator";

export class CreateVolunteerDto {
  // Section 1: Personal Information
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  cnic?: string;

  @IsOptional()
  @IsDateString()
  date_of_birth?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsString()
  city?: string;

  @IsOptional()
  @IsString()
  area?: string;

  // Section 2: Availability & Commitment
  @IsOptional()
  @IsString()
  availability?: string;

  @IsOptional()
  @IsArray()
  availability_days?: string[];

  @IsOptional()
  @IsString()
  hours_per_week?: string;

  @IsOptional()
  @IsBoolean()
  willing_to_travel?: boolean;

  @IsOptional()
  @IsString()
  schedule?: string;

  // Section 3: Skills & Interest
  @IsOptional()
  @IsArray()
  skills?: string[];

  @IsOptional()
  @IsArray()
  interest_areas?: string[];

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  motivation?: string;

  @IsOptional()
  @IsString()
  cv_url?: string;

  // Section 4: Emergency Contact
  @IsOptional()
  @IsString()
  emergency_contact_name?: string;

  @IsOptional()
  @IsString()
  emergency_contact_phone?: string;

  @IsOptional()
  @IsString()
  emergency_contact_relation?: string;

  // ERP / Admin fields
  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  assigned_department?: string;

  @IsOptional()
  @IsBoolean()
  interview_required?: boolean;

  @IsOptional()
  @IsString()
  verification_status?: string;

  // Agreements
  @IsOptional()
  @IsBoolean()
  agreed_to_policy?: boolean;

  @IsOptional()
  @IsBoolean()
  declaration_accurate?: boolean;

  // Existing
  @IsOptional()
  @IsString()
  comments?: string;

  @IsOptional()
  @IsString()
  source?: string;
}
