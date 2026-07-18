import { Test, TestingModule } from "@nestjs/testing";
import { MeezanService } from "./meezan.service";

describe("MeezanService", () => {
  let service: MeezanService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MeezanService],
    }).compile();

    service = module.get<MeezanService>(MeezanService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
