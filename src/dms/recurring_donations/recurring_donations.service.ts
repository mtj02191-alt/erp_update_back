import { Injectable } from "@nestjs/common";
import { CreateRecurringDonationDto } from "./dto/create-recurring_donation.dto";
import { UpdateRecurringDonationDto } from "./dto/update-recurring_donation.dto";

@Injectable()
export class RecurringDonationsService {
  create(createRecurringDonationDto: CreateRecurringDonationDto) {
    return "This action adds a new recurringDonation";
  }

  findAll() {
    return `This action returns all recurringDonations`;
  }

  findOne(id: number) {
    return `This action returns a #${id} recurringDonation`;
  }

  update(id: number, updateRecurringDonationDto: UpdateRecurringDonationDto) {
    return `This action updates a #${id} recurringDonation`;
  }

  remove(id: number) {
    return `This action removes a #${id} recurringDonation`;
  }
}
