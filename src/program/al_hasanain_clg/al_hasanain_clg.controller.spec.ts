import { Test, TestingModule } from "@nestjs/testing";
import { AlHasanainClgController } from "./al_hasanain_clg.controller";
import { AlHasanainClgService } from "./al_hasanain_clg.service";

describe("AlHasanainClgController", () => {
  let controller: AlHasanainClgController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AlHasanainClgController],
      providers: [AlHasanainClgService],
    }).compile();

    controller = module.get<AlHasanainClgController>(AlHasanainClgController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
