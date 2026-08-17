import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from "class-validator";
import { OrganizationAffiliationRole } from "../entities/donor-organization-affiliation.entity";

export class CreateAffiliationDto {
  @IsInt()
  @IsNotEmpty()
  donor_id: number;

  @IsInt()
  @IsNotEmpty()
  organization_id: number;

  @IsOptional()
  @IsInt()
  branch_id?: number;

  @IsOptional()
  @IsEnum(OrganizationAffiliationRole)
  role?: OrganizationAffiliationRole;

  @IsOptional()
  @IsBoolean()
  is_primary?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;
}
