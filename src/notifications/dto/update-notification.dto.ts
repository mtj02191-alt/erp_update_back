import { PartialType } from "@nestjs/mapped-types";
import { IsOptional, IsBoolean } from "class-validator";
import { CreateNotificationDto } from "./create-notification.dto";

export class UpdateNotificationDto extends PartialType(CreateNotificationDto) {
  @IsBoolean()
  @IsOptional()
  is_read?: boolean;
}
