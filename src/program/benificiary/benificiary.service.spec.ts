import { Test, TestingModule } from "@nestjs/testing";
import { BenificiaryService } from "./benificiary.service";

describe("BenificiaryService", () => {
  let service: BenificiaryService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BenificiaryService],
    }).compile();

    service = module.get<BenificiaryService>(BenificiaryService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
