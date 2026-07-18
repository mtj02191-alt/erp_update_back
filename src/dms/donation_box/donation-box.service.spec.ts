import { Test, TestingModule } from "@nestjs/testing";
import { DonationBoxService } from "./donation-box.service";

describe("DonationBoxService", () => {
  let service: DonationBoxService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DonationBoxService],
    }).compile();

    service = module.get<DonationBoxService>(DonationBoxService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
