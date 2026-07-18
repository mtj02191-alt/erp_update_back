import { Test, TestingModule } from "@nestjs/testing";
import { DonationInKindItemsService } from "./donation_in_kind_items.service";

describe("DonationInKindItemsService", () => {
  let service: DonationInKindItemsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DonationInKindItemsService],
    }).compile();

    service = module.get<DonationInKindItemsService>(
      DonationInKindItemsService,
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
