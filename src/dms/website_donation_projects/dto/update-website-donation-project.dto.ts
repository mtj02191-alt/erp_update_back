import { PartialType } from "@nestjs/mapped-types";
import { CreateWebsiteDonationProjectDto } from "./create-website-donation-project.dto";

export class UpdateWebsiteDonationProjectDto extends PartialType(
  CreateWebsiteDonationProjectDto,
) {}
