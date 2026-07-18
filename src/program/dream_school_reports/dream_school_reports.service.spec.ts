import { Test, TestingModule } from "@nestjs/testing";
import { DreamSchoolReportsService } from "./dream_school_reports.service";

describe("DreamSchoolReportsService", () => {
  let service: DreamSchoolReportsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [DreamSchoolReportsService],
    }).compile();

    service = module.get<DreamSchoolReportsService>(DreamSchoolReportsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
