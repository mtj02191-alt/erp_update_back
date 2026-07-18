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
} from "class-validator";
import { UserRole, Department } from "../user.entity";

export class CreateUserDto {
  @IsString()
  first_name: string;

  @IsString()
  last_name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @Length(11, 11)
  phone: string;

  @IsDateString()
  dob: string;

  @IsString()
  address: string;

  @IsString()
  @Length(13, 13)
  cnic: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsEnum(Department)
  department: Department;

  @IsString()
  gender: string;

  @IsDateString()
  joining_date: string;

  @IsString()
  emergency_contact: string;

  @IsString()
  blood_group: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: "Password must be at least 8 characters long" })
  password: string;

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
}
