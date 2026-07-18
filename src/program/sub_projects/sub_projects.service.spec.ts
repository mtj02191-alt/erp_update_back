import { Test, TestingModule } from "@nestjs/testing";
import { SubProjectsService } from "./sub_projects.service";

describe("SubProjectsService", () => {
  let service: SubProjectsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SubProjectsService],
    }).compile();

    service = module.get<SubProjectsService>(SubProjectsService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
