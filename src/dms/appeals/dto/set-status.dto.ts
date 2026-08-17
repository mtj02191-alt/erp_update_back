import { IsEnum } from "class-validator";
import { AppealStatus } from "../entities/appeal.entity";

export class SetAppealStatusDto {
  @IsEnum(AppealStatus)
  status: AppealStatus;
}
