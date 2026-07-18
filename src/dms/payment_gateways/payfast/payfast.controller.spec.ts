import { Test, TestingModule } from "@nestjs/testing";
import { PayfastController } from "./payfast.controller";
import { PayfastService } from "./payfast.service";

describe("PayfastController", () => {
  let controller: PayfastController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PayfastController],
      providers: [PayfastService],
    }).compile();

    controller = module.get<PayfastController>(PayfastController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
