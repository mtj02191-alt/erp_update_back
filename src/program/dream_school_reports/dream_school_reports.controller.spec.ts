import { Test, TestingModule } from "@nestjs/testing";
import { DreamSchoolReportsController } from "./dream_school_reports.controller";
import { DreamSchoolReportsService } from "./dream_school_reports.service";

describe("DreamSchoolReportsController", () => {
  let controller: DreamSchoolReportsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [DreamSchoolReportsController],
      providers: [DreamSchoolReportsService],
    }).compile();

    controller = module.get<DreamSchoolReportsController>(
      DreamSchoolReportsController,
    );
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
