import { PartialType } from "@nestjs/mapped-types";
import { CreateAasCollectionCenterDto } from "./create-aas_collection_center.dto";

export class UpdateAasCollectionCenterDto extends PartialType(
  CreateAasCollectionCenterDto,
) {}
