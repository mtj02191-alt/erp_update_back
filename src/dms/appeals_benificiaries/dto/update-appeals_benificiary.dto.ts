import { PartialType } from "@nestjs/mapped-types";
import { CreateAppealsBenificiaryDto } from "./create-appeals_benificiary.dto";

export class UpdateAppealsBenificiaryDto extends PartialType(
  CreateAppealsBenificiaryDto,
) {}
