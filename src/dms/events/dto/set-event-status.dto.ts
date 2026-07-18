import { IsEnum } from "class-validator";
import { EventStatus } from "../entities/event.entity";

export class SetEventStatusDto {
  @IsEnum(EventStatus)
  status: EventStatus;
}
