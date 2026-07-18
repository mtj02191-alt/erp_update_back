import { PartialType } from "@nestjs/mapped-types";
import { CreateAlHasanainClgDto } from "./create-al_hasanain_clg.dto";

export class UpdateAlHasanainClgDto extends PartialType(
  CreateAlHasanainClgDto,
) {}
