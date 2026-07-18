import {
  IsString,
  IsEnum,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsObject,
  MaxLength,
  MinLength,
} from "class-validator";
import { NotificationType } from "../entities/notification.entity";

export class CreateNotificationDto {
  @IsString()
  @MinLength(1)
  @MaxLength(255)
  title: string;

  @IsString()
  @MinLength(1)
  message: string;

  @IsEnum(NotificationType)
  @IsOptional()
  type?: NotificationType;

  @IsNumber()
  @IsOptional()
  user_id?: number;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  link?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
