import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsIn,
  MinLength,
} from "class-validator";

export class CreateUserDonorDto {
  @IsNumber()
  @IsNotEmpty()
  user_id: number;

  @IsNumber()
  @IsNotEmpty()
  donor_id: number;

  @IsString()
  @IsOptional()
  @IsIn(["active", "inactive"], {
    message: "Status must be either active or inactive",
  })
  status?: string = "active";

  @IsString()
  @IsOptional()
  @MinLength(3, { message: "Notes must be at least 3 characters long" })
  notes?: string;

  @IsNumber()
  @IsNotEmpty()
  assigned_by: number;

  @IsNumber()
  @IsOptional()
  referrer_id?: number;
}
