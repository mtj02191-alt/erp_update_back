import { Test, TestingModule } from "@nestjs/testing";
import { UserDonorsService } from "./user_donors.service";

describe("UserDonorsService", () => {
  let service: UserDonorsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [UserDonorsService],
    }).compile();

    service = module.get<UserDonorsService>(UserDonorsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
