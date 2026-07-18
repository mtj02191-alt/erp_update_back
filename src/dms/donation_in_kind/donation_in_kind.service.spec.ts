import { Test, TestingModule } from "@nestjs/testing";
import { DonationInKindService } from "./donation_in_kind.service";

describe("DonationInKindService", () => {
  let service: DonationInKindService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DonationInKindService],
    }).compile();

    service = module.get<DonationInKindService>(DonationInKindService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
