import { Test, TestingModule } from "@nestjs/testing";
import { CareersController } from "./careers.controller";
import { CareersService } from "./careers.service";

describe("CareersController", () => {
  let controller: CareersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CareersController],
      providers: [CareersService],
    }).compile();

    controller = module.get<CareersController>(CareersController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
