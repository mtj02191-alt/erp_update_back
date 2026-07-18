import { Test, TestingModule } from "@nestjs/testing";
import { AasCollectionCentersReportController } from "./aas_collection_centers_report.controller";
import { AasCollectionCentersReportService } from "./aas_collection_centers_report.service";

describe("AasCollectionCentersReportController", () => {
  let controller: AasCollectionCentersReportController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AasCollectionCentersReportController],
      providers: [AasCollectionCentersReportService],
    }).compile();

    controller = module.get<AasCollectionCentersReportController>(
      AasCollectionCentersReportController,
    );
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
