import { IsString, MinLength, IsNotEmpty } from "class-validator";

export class SetNewPasswordDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: "New password must be at least 8 characters long" })
  newPassword: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, {
    message: "Confirm password must be at least 8 characters long",
  })
  confirmPassword: string;

  @IsString()
  @IsNotEmpty()
  resetToken: string;
}
