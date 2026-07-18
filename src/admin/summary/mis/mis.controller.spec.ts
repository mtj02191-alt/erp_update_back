import { Test, TestingModule } from "@nestjs/testing";
import { MisController } from "./mis.controller";
import { MisService } from "./mis.service";

describe("MisController", () => {
  let controller: MisController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MisController],
      providers: [MisService],
    }).compile();

    controller = module.get<MisController>(MisController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
