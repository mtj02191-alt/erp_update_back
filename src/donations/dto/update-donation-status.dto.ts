import { IsNotEmpty, IsString, IsNumber, IsEnum } from "class-validator";

export enum DonationStatus {
  PENDING = "pending",
  COMPLETED = "completed",
  FAILED = "failed",
  CANCELLED = "cancelled",
  REGISTERED = "registered",
}

export class UpdateDonationStatusDto {
  @IsNotEmpty()
  @IsNumber()
  donation_id: number;

  @IsNotEmpty()
  @IsString()
  @IsEnum(DonationStatus, {
    message:
      "status must be one of: pending, completed, failed, cancelled, registered",
  })
  status: DonationStatus;
}
