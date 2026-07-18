import { IsString, MinLength, IsNotEmpty } from "class-validator";
import { Match } from "../decorators/match.decorator";

export class ChangePasswordDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(8, {
    message: "Current password must be at least 8 characters long",
  })
  currentPassword: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, { message: "New password must be at least 8 characters long" })
  newPassword: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8, {
    message: "Confirm password must be at least 8 characters long",
  })
  @Match("newPassword", { message: "Passwords do not match" })
  confirmPassword: string;
}
