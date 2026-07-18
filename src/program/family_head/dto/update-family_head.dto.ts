import { PartialType } from "@nestjs/mapped-types";
import { CreateFamilyHeadDto } from "./create-family_head.dto";

export class UpdateFamilyHeadDto extends PartialType(CreateFamilyHeadDto) {}
