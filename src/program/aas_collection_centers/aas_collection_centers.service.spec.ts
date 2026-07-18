import { Test, TestingModule } from "@nestjs/testing";
import { AasCollectionCentersService } from "./aas_collection_centers.service";

describe("AasCollectionCentersService", () => {
  let service: AasCollectionCentersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AasCollectionCentersService],
    }).compile();

    service = module.get<AasCollectionCentersService>(
      AasCollectionCentersService,
    );
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
