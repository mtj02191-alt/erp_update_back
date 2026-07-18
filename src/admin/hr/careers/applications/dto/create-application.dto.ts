import {
  IsString,
  IsEmail,
  IsOptional,
  IsNumber,
  IsUrl,
  MinLength,
  MaxLength,
} from "class-validator";

export class CreateApplicationDto {
  @IsString()
  @MinLength(2)
  @MaxLength(255)
  applicant_name: string;

  @IsEmail()
  @MaxLength(255)
  email: string;

  @IsString()
  @MinLength(10)
  @MaxLength(20)
  phone_number: string;

  @IsOptional()
  @IsUrl()
  @MaxLength(500)
  resume_url?: string;

  @IsString()
  @MinLength(100)
  cover_letter: string;

  @IsOptional()
  @IsNumber()
  job_id?: number;
}
