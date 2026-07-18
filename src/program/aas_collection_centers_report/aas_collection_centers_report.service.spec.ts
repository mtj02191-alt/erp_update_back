import { Test, TestingModule } from "@nestjs/testing";
import { AasCollectionCentersReportService } from "./aas_collection_centers_report.service";

describe("AasCollectionCentersReportService", () => {
  let service: AasCollectionCentersReportService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AasCollectionCentersReportService],
    }).compile();

    service = module.get<AasCollectionCentersReportService>(
      AasCollectionCentersReportService,
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
