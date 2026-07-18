import { Injectable } from "@nestjs/common";
import { CreateDonationInKindDto } from "./dto/create-donation_in_kind.dto";
import { UpdateDonationInKindDto } from "./dto/update-donation_in_kind.dto";

@Injectable()
export class DonationInKindService {
  create(createDonationInKindDto: CreateDonationInKindDto) {
    return "This action adds a new donationInKind";
  }

  findAll() {
    return `This action returns all donationInKind`;
  }

  findOne(id: number) {
    return `This action returns a #${id} donationInKind`;
  }

  update(id: number, updateDonationInKindDto: UpdateDonationInKindDto) {
    return `This action updates a #${id} donationInKind`;
  }

  remove(id: number) {
    return `This action removes a #${id} donationInKind`;
  }
}
