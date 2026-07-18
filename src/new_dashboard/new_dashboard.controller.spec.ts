import { Test, TestingModule } from "@nestjs/testing";
import { NewDashboardController } from "./new_dashboard.controller";
import { NewDashboardService } from "./new_dashboard.service";

describe("NewDashboardController", () => {
  let controller: NewDashboardController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [NewDashboardController],
      providers: [NewDashboardService],
    }).compile();

    controller = module.get<NewDashboardController>(NewDashboardController);
  });

  it("should be defined", () => {
    expect(controller).toBeDefined();
  });
});
