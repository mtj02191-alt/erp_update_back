import { PartialType } from "@nestjs/mapped-types";
import { CreateOrganizationBranchDto } from "./create-organization-branch.dto";

export class UpdateOrganizationBranchDto extends PartialType(
  CreateOrganizationBranchDto,
) {}
