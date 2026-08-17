import {
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";
import {
  AidAttachmentContext,
  AidCeoApprovalStatus,
  AidDeliveryStatus,
  AidEducationLevel,
  AidHouseholdRole,
  AidKinshipRelation,
  AidMaritalStatus,
  AidPersonGender,
  AidRequestType,
  AidWriterRelation,
} from "../aid.enums";

export class CreateAidPersonDto {
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  full_name: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  cnic?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  @IsOptional()
  @IsEnum(AidPersonGender)
  gender?: AidPersonGender | null;

  @IsOptional()
  @IsDateString()
  date_of_birth?: string | null;

  @IsOptional()
  @IsEnum(AidMaritalStatus)
  marital_status?: AidMaritalStatus | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  occupation?: string | null;

  @IsOptional()
  @IsEnum(AidEducationLevel)
  education_level?: AidEducationLevel | null;

  @IsOptional()
  @IsString()
  monthly_income?: string | number | null;

  @IsOptional()
  @IsBoolean()
  is_alive?: boolean;

  @IsOptional()
  @IsString()
  health_notes?: string | null;

  @IsOptional()
  @IsString()
  address?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class UpdateAidPersonDto {
  @IsOptional()
  @IsString()
  @MinLength(1)
  @MaxLength(200)
  full_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(15)
  cnic?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(30)
  phone?: string | null;

  @IsOptional()
  @IsEnum(AidPersonGender)
  gender?: AidPersonGender | null;

  @IsOptional()
  @IsDateString()
  date_of_birth?: string | null;

  @IsOptional()
  @IsEnum(AidMaritalStatus)
  marital_status?: AidMaritalStatus | null;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  occupation?: string | null;

  @IsOptional()
  @IsEnum(AidEducationLevel)
  education_level?: AidEducationLevel | null;

  @IsOptional()
  @IsString()
  monthly_income?: string | number | null;

  @IsOptional()
  @IsBoolean()
  is_alive?: boolean;

  @IsOptional()
  @IsString()
  health_notes?: string | null;

  @IsOptional()
  @IsString()
  address?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  city?: string | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  @IsBoolean()
  is_active?: boolean;
}

export class CreateAidHouseholdDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  code?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string | null;

  @IsOptional()
  @IsString()
  address?: string | null;

  @IsOptional()
  @IsInt()
  head_person_id?: number | null;

  @IsOptional()
  @IsString()
  notes?: string | null;

  @IsOptional()
  members?: CreateAidHouseholdMemberDto[];
}

export class UpdateAidHouseholdDto {
  @IsOptional()
  @IsString()
  @MaxLength(40)
  code?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  label?: string | null;

  @IsOptional()
  @IsString()
  address?: string | null;

  @IsOptional()
  @IsInt()
  head_person_id?: number | null;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class CreateAidHouseholdMemberDto {
  @IsInt()
  person_id: number;

  @IsOptional()
  @IsEnum(AidHouseholdRole)
  role_in_household?: AidHouseholdRole;
}

export class CreateAidKinshipDto {
  @IsInt()
  to_person_id: number;

  @IsEnum(AidKinshipRelation)
  relation_type: AidKinshipRelation;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

/** Create or link a relative and attach kinship edge from ego person. */
export class CreateAidFamilyMemberDto {
  @IsEnum(AidKinshipRelation)
  relation_type: AidKinshipRelation;

  @IsOptional()
  @IsInt()
  existing_person_id?: number;

  @IsOptional()
  person?: CreateAidPersonDto;

  @IsOptional()
  @IsString()
  notes?: string | null;
}

export class CreateAidApplicationDto {
  @IsOptional()
  @IsInt()
  beneficiary_person_id?: number;

  @IsOptional()
  @IsInt()
  household_id?: number | null;

  @IsOptional()
  @IsInt()
  writer_person_id?: number;

  @IsOptional()
  @IsEnum(AidWriterRelation)
  writer_relation?: AidWriterRelation;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string | null;

  @IsOptional()
  @IsString()
  request_summary?: string | null;

  @IsOptional()
  @IsEnum(AidRequestType)
  requested_aid_type?: AidRequestType;

  @IsOptional()
  @IsInt()
  assigned_to_user_id?: number | null;

  /** Inline create beneficiary when id not known yet */
  @IsOptional()
  beneficiary?: CreateAidPersonDto;

  @IsOptional()
  writer?: CreateAidPersonDto;

  /** Family tree intake: parents, spouse, spouse, guardians linked to beneficiary. */
  @IsOptional()
  family_members?: CreateAidFamilyMemberDto[];
}

export class UpdateAidApplicationDto {
  @IsOptional()
  @IsInt()
  household_id?: number | null;

  @IsOptional()
  @IsEnum(AidWriterRelation)
  writer_relation?: AidWriterRelation;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  title?: string | null;

  @IsOptional()
  @IsString()
  request_summary?: string | null;

  @IsOptional()
  @IsEnum(AidRequestType)
  requested_aid_type?: AidRequestType;

  @IsOptional()
  @IsInt()
  assigned_to_user_id?: number | null;

  @IsOptional()
  @IsString()
  verification_notes?: string | null;
}

export class RejectAidApplicationDto {
  @IsString()
  @MinLength(2)
  rejection_reason: string;
}

export class VerifyAidApplicationDto {
  @IsOptional()
  @IsString()
  verification_notes?: string | null;

  /** Map of checklist key → checked (true/false). Required items must be true. */
  @IsObject()
  verification_checklist: Record<string, boolean>;

  /** Required when beneficiary/household already received aid this year or within cooldown. */
  @IsOptional()
  @IsString()
  @MinLength(5)
  leakage_override_reason?: string | null;
}

export class CeoDecideAidApplicationDto {
  @IsEnum(AidCeoApprovalStatus)
  decision: AidCeoApprovalStatus.APPROVED | AidCeoApprovalStatus.REJECTED;

  @IsOptional()
  @IsString()
  ceo_rejection_reason?: string | null;

  /** Required on approve when leakage flags are active and not yet overridden. */
  @IsOptional()
  @IsString()
  @MinLength(5)
  leakage_override_reason?: string | null;
}

export class DeliverAidApplicationDto {
  @IsEnum(AidDeliveryStatus)
  delivery_status: AidDeliveryStatus;

  @IsOptional()
  @IsString()
  delivery_notes?: string | null;
}

export class UploadAidAttachmentDto {
  @IsOptional()
  @IsEnum(AidAttachmentContext)
  context?: AidAttachmentContext;

  @IsOptional()
  @IsString()
  description?: string | null;

  @IsOptional()
  @IsInt()
  person_id?: number | null;
}
