import {
  IsArray,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  ValidateNested,
} from "class-validator";
import { Type } from "class-transformer";

export type OfflineSyncActionType =
  | "CREATE_DONOR"
  | "UPDATE_DONOR"
  | "CREATE_DONATION"
  | "UPDATE_DONATION"
  | "CREATE_DONATION_BOX_DONATION";

export class OfflineSyncActionDto {
  @IsString()
  @IsNotEmpty()
  queue_id: string;

  @IsString()
  @IsNotEmpty()
  type: OfflineSyncActionType;

  @IsString()
  @IsNotEmpty()
  local_id: string;

  @IsOptional()
  @IsString()
  depends_on?: string;

  @IsObject()
  payload: Record<string, any>;
}

export class OfflineSyncBatchDto {
  @IsOptional()
  @IsString()
  device_id?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OfflineSyncActionDto)
  actions: OfflineSyncActionDto[];
}
