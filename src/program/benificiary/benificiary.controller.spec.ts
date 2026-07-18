import { Test, TestingModule } from "@nestjs/testing";
import { BenificiaryController } from "./benificiary.controller";
import { BenificiaryService } from "./benificiary.service";

describe("BenificiaryController", () => {
  let controller: BenificiaryController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BenificiaryController],
      providers: [BenificiaryService],
    }).compile();

    controller = module.get<BenificiaryController>(BenificiaryController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
