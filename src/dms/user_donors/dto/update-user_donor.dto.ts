import {
  IsOptional,
  IsString,
  IsIn,
  IsNumber,
  IsNotEmpty,
} from "class-validator";

export class UpdateUserDonorDto {
  @IsString()
  @IsOptional()
  @IsIn(["active", "inactive", "transferred"], {
    message: "Status must be active, inactive, or transferred",
  })
  status?: string;

  @IsString()
  @IsOptional()
  notes?: string;

  @IsNumber()
  @IsOptional()
  referrer_id?: number;
}

export class TransferDonorDto {
  @IsNumber()
  @IsNotEmpty()
  donor_id: number;

  @IsNumber()
  @IsNotEmpty()
  from_user_id: number;

  @IsNumber()
  @IsNotEmpty()
  to_user_id: number;

  @IsNumber()
  @IsNotEmpty()
  assigned_by: number;

  @IsString()
  @IsOptional()
  notes?: string;
}

export class AssignDonorDto {
  @IsNumber()
  @IsNotEmpty()
  user_id: number;

  @IsNumber()
  @IsNotEmpty()
  donor_id: number;

  @IsNumber()
  @IsNotEmpty()
  assigned_by: number;

  @IsString()
  @IsOptional()
  notes?: string;
}
