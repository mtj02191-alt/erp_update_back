import { IsString, IsEmail, IsOptional } from "class-validator";

export class CreateNewsletterDto {
  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  first_name?: string;

  @IsOptional()
  @IsString()
  last_name?: string;
}
