import { Test, TestingModule } from "@nestjs/testing";
import { FamilyHeadController } from "./family_head.controller";
import { FamilyHeadService } from "./family_head.service";

describe("FamilyHeadController", () => {
  let controller: FamilyHeadController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [FamilyHeadController],
      providers: [FamilyHeadService],
    }).compile();

    controller = module.get<FamilyHeadController>(FamilyHeadController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
