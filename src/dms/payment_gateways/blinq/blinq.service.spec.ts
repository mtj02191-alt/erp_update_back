import { Test, TestingModule } from "@nestjs/testing";
import { BlinqService } from "./blinq.service";

describe("BlinqService", () => {
  let service: BlinqService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [BlinqService],
    }).compile();

    service = module.get<BlinqService>(BlinqService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
