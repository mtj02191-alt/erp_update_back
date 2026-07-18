import { IsDate, IsNumber, IsNotEmpty } from "class-validator";

export class CreateStoreDto {
  @IsDate()
  @IsNotEmpty()
  date: Date;

  @IsNumber()
  @IsNotEmpty()
  generated_demands: number;

  @IsNumber()
  @IsNotEmpty()
  pending_demands: number;

  @IsNumber()
  @IsNotEmpty()
  generated_grn: number;

  @IsNumber()
  @IsNotEmpty()
  pending_grn: number;

  @IsNumber()
  @IsNotEmpty()
  rejected_demands: number;
}
