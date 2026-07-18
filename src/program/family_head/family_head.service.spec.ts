import { Test, TestingModule } from "@nestjs/testing";
import { FamilyHeadService } from "./family_head.service";

describe("FamilyHeadService", () => {
  let service: FamilyHeadService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [FamilyHeadService],
    }).compile();

    service = module.get<FamilyHeadService>(FamilyHeadService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
