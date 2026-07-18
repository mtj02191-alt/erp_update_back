import { Test, TestingModule } from "@nestjs/testing";
import { DonationBoxDonationService } from "./donation_box_donation.service";

describe("DonationBoxDonationService", () => {
  let service: DonationBoxDonationService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DonationBoxDonationService],
    }).compile();

    service = module.get<DonationBoxDonationService>(
      DonationBoxDonationService,
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
