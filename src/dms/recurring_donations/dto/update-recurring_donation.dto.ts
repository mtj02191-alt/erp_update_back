import { PartialType } from "@nestjs/mapped-types";
import { CreateRecurringDonationDto } from "./create-recurring_donation.dto";

export class UpdateRecurringDonationDto extends PartialType(
  CreateRecurringDonationDto,
) {}
