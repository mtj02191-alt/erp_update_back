import { Test, TestingModule } from "@nestjs/testing";
import { UserDonorsController } from "./user_donors.controller";
import { UserDonorsService } from "./user_donors.service";

describe("UserDonorsController", () => {
  let controller: UserDonorsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UserDonorsController],
      providers: [UserDonorsService],
    }).compile();

    controller = module.get<UserDonorsController>(UserDonorsController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
