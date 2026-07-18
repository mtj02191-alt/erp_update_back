import { Test, TestingModule } from "@nestjs/testing";
import { DreamSchoolsController } from "./dream_schools.controller";
import { DreamSchoolsService } from "./dream_schools.service";

describe("DreamSchoolsController", () => {
  let controller: DreamSchoolsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DreamSchoolsController],
      providers: [DreamSchoolsService],
    }).compile();

    controller = module.get<DreamSchoolsController>(DreamSchoolsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
