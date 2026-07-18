import { Test, TestingModule } from "@nestjs/testing";
import { DonationBoxDonationController } from "./donation_box_donation.controller";
import { DonationBoxDonationService } from "./donation_box_donation.service";

describe("DonationBoxDonationController", () => {
  let controller: DonationBoxDonationController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DonationBoxDonationController],
      providers: [DonationBoxDonationService],
    }).compile();

    controller = module.get<DonationBoxDonationController>(
      DonationBoxDonationController,
    );
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
