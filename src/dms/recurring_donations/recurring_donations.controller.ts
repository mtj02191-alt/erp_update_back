import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from "@nestjs/common";
import { RecurringDonationsService } from "./recurring_donations.service";
import { CreateRecurringDonationDto } from "./dto/create-recurring_donation.dto";
import { UpdateRecurringDonationDto } from "./dto/update-recurring_donation.dto";

@Controller("recurring-donations")
export class RecurringDonationsController {
  constructor(
    private readonly recurringDonationsService: RecurringDonationsService,
  ) {}

  @Post()
  create(@Body() createRecurringDonationDto: CreateRecurringDonationDto) {
    return this.recurringDonationsService.create(createRecurringDonationDto);
  }

  @Get()
  findAll() {
    return this.recurringDonationsService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.recurringDonationsService.findOne(+id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() updateRecurringDonationDto: UpdateRecurringDonationDto,
  ) {
    return this.recurringDonationsService.update(
      +id,
      updateRecurringDonationDto,
    );
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.recurringDonationsService.remove(+id);
  }
}
