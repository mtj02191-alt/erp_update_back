import { PartialType } from "@nestjs/mapped-types";
import { CreateBenificiaryDto } from "./create-benificiary.dto";

export class UpdateBenificiaryDto extends PartialType(CreateBenificiaryDto) {}
