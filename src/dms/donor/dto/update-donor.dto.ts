import { IsOptional, IsString } from "class-validator";

export class UpdateDonorDto {
  @IsString()
  @IsOptional()
  business_type?: string | null;

  @IsString()
  @IsOptional()
  business_type_other?: string | null;

  @IsString()
  @IsOptional()
  area_of_interest?: string | null;
}
