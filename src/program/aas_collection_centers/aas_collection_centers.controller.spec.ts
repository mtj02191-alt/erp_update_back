import { Test, TestingModule } from "@nestjs/testing";
import { AasCollectionCentersController } from "./aas_collection_centers.controller";
import { AasCollectionCentersService } from "./aas_collection_centers.service";

describe("AasCollectionCentersController", () => {
  let controller: AasCollectionCentersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AasCollectionCentersController],
      providers: [AasCollectionCentersService],
    }).compile();

    controller = module.get<AasCollectionCentersController>(
      AasCollectionCentersController,
    );
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
