import { Test, TestingModule } from "@nestjs/testing";
import { DreamSchoolsService } from "./dream_schools.service";

describe("DreamSchoolsService", () => {
  let service: DreamSchoolsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DreamSchoolsService],
    }).compile();

    service = module.get<DreamSchoolsService>(DreamSchoolsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
