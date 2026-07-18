import { Test, TestingModule } from "@nestjs/testing";
import { DonationInKindItemsController } from "./donation_in_kind_items.controller";
import { DonationInKindItemsService } from "./donation_in_kind_items.service";

describe("DonationInKindItemsController", () => {
  let controller: DonationInKindItemsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DonationInKindItemsController],
      providers: [DonationInKindItemsService],
    }).compile();

    controller = module.get<DonationInKindItemsController>(
      DonationInKindItemsController,
    );
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
