import { Test, TestingModule } from "@nestjs/testing";
import { CareersService } from "./careers.service";

describe("CareersService", () => {
  let service: CareersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CareersService],
    }).compile();

    service = module.get<CareersService>(CareersService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
