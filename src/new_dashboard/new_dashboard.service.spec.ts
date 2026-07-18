import { Test, TestingModule } from "@nestjs/testing";
import { getRepositoryToken } from "@nestjs/typeorm";
import { NewDashboardService } from "./new_dashboard.service";
import { ProgramEntity } from "../program/programs/entities/program.entity";
import { ApplicationReport } from "../program/application_reports/entities/application-report.entity";

describe("NewDashboardService", () => {
  let service: NewDashboardService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NewDashboardService,
        {
          provide: getRepositoryToken(ProgramEntity),
          useValue: {},
        },
        {
          provide: getRepositoryToken(ApplicationReport),
          useValue: {},
        },
      ],
    }).compile();

    service = module.get<NewDashboardService>(NewDashboardService);
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });
});
