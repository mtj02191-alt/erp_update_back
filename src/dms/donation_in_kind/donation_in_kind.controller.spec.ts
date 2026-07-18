import { Test, TestingModule } from "@nestjs/testing";
import { DonationInKindController } from "./donation_in_kind.controller";
import { DonationInKindService } from "./donation_in_kind.service";

describe("DonationInKindController", () => {
  let controller: DonationInKindController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DonationInKindController],
      providers: [DonationInKindService],
    }).compile();

    controller = module.get<DonationInKindController>(DonationInKindController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
