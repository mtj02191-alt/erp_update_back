import { PartialType } from "@nestjs/mapped-types";
import { CreateAasCollectionCentersReportDto } from "./create-aas_collection_centers_report.dto";

export class UpdateAasCollectionCentersReportDto extends PartialType(
  CreateAasCollectionCentersReportDto,
) {}
