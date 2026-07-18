import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsArray,
  IsOptional,
  IsBoolean,
  IsDateString,
  MinLength,
  MaxLength,
  ArrayMinSize,
} from "class-validator";
import { JobType, JobStatus } from "../entities/job.entity";

export class CreateJobDto {
  @IsString()
  @IsNotEmpty({ message: "Title is required" })
  @MinLength(3, { message: "Title must be at least 3 characters" })
  @MaxLength(255, { message: "Title must not exceed 255 characters" })
  title: string;

  @IsOptional()
  @IsString()
  slug?: string; // Auto-generated if not provided

  @IsOptional()
  @IsString()
  icon?: string;

  @IsString()
  @IsNotEmpty({ message: "Department is required" })
  department: string;

  @IsEnum(JobType, {
    message: "Type must be Full Time, Part Time, or Contract",
  })
  @IsNotEmpty({ message: "Type is required" })
  type: JobType;

  @IsString()
  @IsNotEmpty({ message: "Location is required" })
  location: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  experience?: string[];

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  skills?: string[];

  @IsOptional()
  @IsDateString()
  posted_date?: string;

  @IsString()
  @IsNotEmpty({ message: "About is required" })
  @MinLength(50, { message: "About must be at least 50 characters" })
  about: string;

  @IsArray()
  @IsNotEmpty({ message: "Qualifications are required" })
  @ArrayMinSize(1, { message: "At least one qualification is required" })
  @IsString({ each: true })
  qualifications: string[];

  @IsArray()
  @IsNotEmpty({ message: "Responsibilities are required" })
  @ArrayMinSize(1, { message: "At least one responsibility is required" })
  @IsString({ each: true })
  responsibilities: string[];

  @IsOptional()
  @IsEnum(JobStatus)
  status?: JobStatus;

  @IsOptional()
  @IsBoolean()
  is_featured?: boolean;

  @IsOptional()
  @IsDateString()
  closing_date?: Date;
}
