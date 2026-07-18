import { PartialType } from "@nestjs/mapped-types";
import { CreateDreamSchoolDto } from "./create-dream_school.dto";

export class UpdateDreamSchoolDto extends PartialType(CreateDreamSchoolDto) {}
