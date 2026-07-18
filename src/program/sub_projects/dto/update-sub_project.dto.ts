import { PartialType } from "@nestjs/mapped-types";
import { CreateSubProjectDto } from "./create-sub_project.dto";

export class UpdateSubProjectDto extends PartialType(CreateSubProjectDto) {}
