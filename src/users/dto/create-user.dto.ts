import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsDateString,
  Length,
  MinLength,
  IsNotEmpty,
  IsArray,
  IsNumber,
  IsBoolean,
  ValidateIf,
} from "class-validator";
import { UserRole, Department } from "../user.entity";

export class CreateUserDto {
  @IsString()
  @IsNotEmpty()
  first_name: string;

  @IsOptional()
  @IsString()
  last_name?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v != null && String(v).trim() !== "")
  @IsEmail()
  email?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v != null && String(v).trim() !== "")
  @IsString()
  @Length(11, 11)
  phone?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v != null && String(v).trim() !== "")
  @IsDateString()
  dob?: string | null;

  @IsOptional()
  @IsString()
  address?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v != null && String(v).trim() !== "")
  @IsString()
  @Length(13, 13)
  cnic?: string | null;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;

  @IsEnum(Department)
  @IsNotEmpty()
  department: Department;

  @IsOptional()
  @IsString()
  gender?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v != null && String(v).trim() !== "")
  @IsDateString()
  joining_date?: string | null;

  @IsOptional()
  @IsString()
  emergency_contact?: string | null;

  @IsOptional()
  @IsString()
  blood_group?: string | null;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  password: string;

  @IsOptional()
  @IsString()
  user_code?: string | null;

  // Geographic assignment fields (for fund_raising department)
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  assigned_countries?: number[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  assigned_regions?: number[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  assigned_districts?: number[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  assigned_tehsils?: number[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  assigned_cities?: number[];

  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  assigned_routes?: number[];

  @IsOptional()
  @IsNumber()
  manager_id?: number | null;

  /** Multiple reporting managers (preferred). Merged with manager_id when both sent. */
  @IsOptional()
  @IsArray()
  @IsNumber({}, { each: true })
  manager_ids?: number[];

  @IsOptional()
  @IsBoolean()
  geographic_off?: boolean;
}
