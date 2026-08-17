import { Test, TestingModule } from '@nestjs/testing';
import { CrowdFundingService } from './crowd_funding.service';

describe('CrowdFundingService', () => {
  let service: CrowdFundingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [CrowdFundingService],
    }).compile();

    service = module.get<CrowdFundingService>(CrowdFundingService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
