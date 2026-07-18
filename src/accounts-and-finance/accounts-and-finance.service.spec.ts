import { Test, TestingModule } from "@nestjs/testing";
import { AccountsAndFinanceService } from "./accounts-and-finance.service";

describe("AccountsAndFinanceService", () => {
  let service: AccountsAndFinanceService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AccountsAndFinanceService],
    }).compile();

    service = module.get<AccountsAndFinanceService>(AccountsAndFinanceService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
