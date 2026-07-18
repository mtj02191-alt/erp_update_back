import { Test, TestingModule } from "@nestjs/testing";
import { GoldSilverPriceController } from "./gold_silver_price.controller";
import { GoldSilverPriceService } from "./gold_silver_price.service";

describe("GoldSilverPriceController", () => {
  let controller: GoldSilverPriceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GoldSilverPriceController],
      providers: [GoldSilverPriceService],
    }).compile();

    controller = module.get<GoldSilverPriceController>(
      GoldSilverPriceController,
    );
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
