import { IsOptional, IsString } from "class-validator";

export class UpdateDonationNoteDto {
  @IsOptional()
  @IsString()
  note?: string;
}
