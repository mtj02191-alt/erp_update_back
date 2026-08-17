import { PartialType } from "@nestjs/mapped-types";
import { CreateManualRecurringPledgeDto } from "./create-manual-recurring-pledge.dto";

export class UpdateManualRecurringPledgeDto extends PartialType(
  CreateManualRecurringPledgeDto,
) {}
