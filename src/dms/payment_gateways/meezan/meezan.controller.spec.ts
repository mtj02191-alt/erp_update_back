import { Test, TestingModule } from "@nestjs/testing";
import { MeezanController } from "./meezan.controller";
import { MeezanService } from "./meezan.service";

describe("MeezanController", () => {
  let controller: MeezanController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MeezanController],
      providers: [MeezanService],
    }).compile();

    controller = module.get<MeezanController>(MeezanController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
