import { Test, TestingModule } from "@nestjs/testing";
import { AlHasanainClgService } from "./al_hasanain_clg.service";

describe("AlHasanainClgService", () => {
  let service: AlHasanainClgService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AlHasanainClgService],
    }).compile();

    service = module.get<AlHasanainClgService>(AlHasanainClgService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
