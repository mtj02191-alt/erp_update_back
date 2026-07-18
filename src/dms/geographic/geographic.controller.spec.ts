import { Test, TestingModule } from "@nestjs/testing";
import { GeographicController } from "./geographic.controller";
import { GeographicService } from "./geographic.service";

describe("GeographicController", () => {
  let controller: GeographicController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GeographicController],
      providers: [GeographicService],
    }).compile();

    controller = module.get<GeographicController>(GeographicController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
