import { Test, TestingModule } from "@nestjs/testing";
import { ProcurementsService } from "./procurements.service";

describe("ProcurementsService", () => {
  let service: ProcurementsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ProcurementsService],
    }).compile();

    service = module.get<ProcurementsService>(ProcurementsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
