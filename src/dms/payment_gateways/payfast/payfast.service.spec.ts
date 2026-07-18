import { Test, TestingModule } from "@nestjs/testing";
import { PayfastService } from "./payfast.service";

describe("PayfastService", () => {
  let service: PayfastService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PayfastService],
    }).compile();

    service = module.get<PayfastService>(PayfastService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
