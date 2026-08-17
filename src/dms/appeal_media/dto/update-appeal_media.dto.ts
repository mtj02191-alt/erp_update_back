import { PartialType, OmitType } from "@nestjs/mapped-types";
import { CreateAppealMediaDto } from "./create-appeal_media.dto";

export class UpdateAppealMediaDto extends PartialType(
  OmitType(CreateAppealMediaDto, ["appeal_id"] as const),
) {}
