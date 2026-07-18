import { Test, TestingModule } from "@nestjs/testing";
import { AccountsAndFinanceController } from "./accounts-and-finance.controller";

describe("AccountsAndFinanceController", () => {
  let controller: AccountsAndFinanceController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AccountsAndFinanceController],
    }).compile();

    controller = module.get<AccountsAndFinanceController>(
      AccountsAndFinanceController,
    );
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
