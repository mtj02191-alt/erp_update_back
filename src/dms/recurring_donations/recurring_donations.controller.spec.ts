import { Test, TestingModule } from "@nestjs/testing";
import { RecurringDonationsController } from "./recurring_donations.controller";
import { RecurringDonationsService } from "./recurring_donations.service";

describe("RecurringDonationsController", () => {
  let controller: RecurringDonationsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecurringDonationsController],
      providers: [RecurringDonationsService],
    }).compile();

    controller = module.get<RecurringDonationsController>(
      RecurringDonationsController,
    );
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
