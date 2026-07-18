import { Test, TestingModule } from "@nestjs/testing";
import { MisService } from "./mis.service";

describe("MisService", () => {
  let service: MisService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MisService],
    }).compile();

    service = module.get<MisService>(MisService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
