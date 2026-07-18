import { Test, TestingModule } from "@nestjs/testing";
import { RecurringDonationsService } from "./recurring_donations.service";

describe("RecurringDonationsService", () => {
  let service: RecurringDonationsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [RecurringDonationsService],
    }).compile();

    service = module.get<RecurringDonationsService>(RecurringDonationsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
