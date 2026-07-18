import { Test, TestingModule } from "@nestjs/testing";
import { GoldSilverPriceService } from "./gold_silver_price.service";

describe("GoldSilverPriceService", () => {
  let service: GoldSilverPriceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GoldSilverPriceService],
    }).compile();

    service = module.get<GoldSilverPriceService>(GoldSilverPriceService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
