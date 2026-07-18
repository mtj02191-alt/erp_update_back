import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
} from "@nestjs/common";
import { DonationInKindService } from "./donation_in_kind.service";
import { CreateDonationInKindDto } from "./dto/create-donation_in_kind.dto";
import { UpdateDonationInKindDto } from "./dto/update-donation_in_kind.dto";

@Controller("donation-in-kind")
export class DonationInKindController {
  constructor(private readonly donationInKindService: DonationInKindService) {}

  @Post()
  create(@Body() createDonationInKindDto: CreateDonationInKindDto) {
    return this.donationInKindService.create(createDonationInKindDto);
  }

  @Get()
  findAll() {
    return this.donationInKindService.findAll();
  }

  @Get(":id")
  findOne(@Param("id") id: string) {
    return this.donationInKindService.findOne(+id);
  }

  @Patch(":id")
  update(
    @Param("id") id: string,
    @Body() updateDonationInKindDto: UpdateDonationInKindDto,
  ) {
    return this.donationInKindService.update(+id, updateDonationInKindDto);
  }

  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.donationInKindService.remove(+id);
  }
}
