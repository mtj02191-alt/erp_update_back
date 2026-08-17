import { PartialType, OmitType } from "@nestjs/mapped-types";
import { CreateAppealUpdateDto } from "./create-appeal_update.dto";

export class UpdateAppealUpdateDto extends PartialType(
  OmitType(CreateAppealUpdateDto, ["appeal_id"] as const),
) {}
