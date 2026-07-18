import { Test, TestingModule } from "@nestjs/testing";
import { GeographicService } from "./geographic.service";

describe("GeographicService", () => {
  let service: GeographicService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GeographicService],
    }).compile();

    service = module.get<GeographicService>(GeographicService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
