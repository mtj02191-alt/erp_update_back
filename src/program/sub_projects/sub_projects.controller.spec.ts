import { Test, TestingModule } from "@nestjs/testing";
import { SubProjectsController } from "./sub_projects.controller";
import { SubProjectsService } from "./sub_projects.service";

describe("SubProjectsController", () => {
  let controller: SubProjectsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SubProjectsController],
      providers: [SubProjectsService],
    }).compile();

    controller = module.get<SubProjectsController>(SubProjectsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
