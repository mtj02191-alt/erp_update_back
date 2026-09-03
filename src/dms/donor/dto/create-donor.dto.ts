import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  MinLength,
  IsNotEmpty,
  IsNumber,
  IsDateString,
  IsInt,
  IsBoolean,
  ValidateIf,
} from "class-validator";
import { Type } from "class-transformer";
import { DonorType } from "../entities/donor.entity";
import { DonorPipelineStage } from "../pipeline/donor-pipeline.constants";
import { OrganizationAffiliationRole } from "../../organizations/entities/donor-organization-affiliation.entity";

export class CreateDonorDto {
  @IsEnum(DonorType)
  @IsNotEmpty()
  donor_type: DonorType;

  /**
   * Optional CSR metadata (Corporate Social Responsibility donors).
   * Stored as additive nullable columns.
   */
  @IsString()
  @IsOptional()
  business_type?: string;

  /** Free-text value when `business_type` is "Other". */
  @IsString()
  @IsOptional()
  business_type_other?: string;

  @IsString()
  @IsOptional()
  area_of_interest?: string;

  @IsOptional()
  @ValidateIf((_, v) => v != null && String(v).trim() !== "")
  @IsEmail()
  email?: string;

  @IsString()
  @IsOptional()
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  password?: string;

  @IsOptional()
  @ValidateIf((_, v) => v != null && String(v).trim() !== "")
  @IsString()
  phone?: string;

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

  @IsOptional()
  @IsDateString()
  date_of_birth?: string;

  /** Required — for CSR this is the contact person name. */
  @IsString()
  @IsNotEmpty({ message: "Name is required" })
  name?: string;

  @IsString()
  @IsOptional()
  first_name?: string;

  @IsString()
  @IsOptional()
  last_name?: string;

  /**
   * Required for CSR (enforced in DonorService.register).
   * Optional for individual (person ↔ org affiliation).
   */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  organization_id?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  organization_branch_id?: number;

  @IsOptional()
  @IsEnum(OrganizationAffiliationRole)
  affiliation_role?: OrganizationAffiliationRole;

  @IsOptional()
  @IsBoolean()
  affiliation_is_primary?: boolean;

  @IsOptional()
  @IsNumber()
  referrer_user_id?: number;

  @IsNumber()
  assigned_to_user_id?: number;

  @IsOptional()
  @IsEnum(DonorPipelineStage)
  pipeline_stage?: DonorPipelineStage;
}
