import { PartialType } from "@nestjs/mapped-types";
import { CreateResumeCollectionDto } from "./create-resume_collection.dto";

export class UpdateResumeCollectionDto extends PartialType(
  CreateResumeCollectionDto,
) {}
