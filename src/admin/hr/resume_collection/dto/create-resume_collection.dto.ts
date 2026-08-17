import { IsEnum, IsOptional, IsString, MaxLength } from "class-validator";
import { Department } from "../../../../users/user.entity";

export class CreateResumeCollectionDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  applicant_name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  cnic?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  address?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120)
  city?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  role?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  experience?: string;

  @IsOptional()
  @IsString()
  @MaxLength(5000)
  education?: string;

  @IsOptional()
  @IsEnum(Department)
  department?: Department;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  notes?: string;

  /** Set when file was already uploaded during /analyze */
  @IsOptional()
  @IsString()
  @MaxLength(1000)
  resume_url?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  resume_file_key?: string;

  @IsOptional()
  @IsString()
  @MaxLength(255)
  original_filename?: string;
}
