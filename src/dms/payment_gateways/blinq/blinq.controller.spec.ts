import { Test, TestingModule } from "@nestjs/testing";
import { BlinqController } from "./blinq.controller";
import { BlinqService } from "./blinq.service";

describe("BlinqController", () => {
  let controller: BlinqController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BlinqController],
      providers: [BlinqService],
    }).compile();

    controller = module.get<BlinqController>(BlinqController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
