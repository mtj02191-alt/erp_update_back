import { Test, TestingModule } from '@nestjs/testing';
import { CrowdFundingController } from './crowd_funding.controller';
import { CrowdFundingService } from './crowd_funding.service';

describe('CrowdFundingController', () => {
  let controller: CrowdFundingController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CrowdFundingController],
      providers: [CrowdFundingService],
    }).compile();

    controller = module.get<CrowdFundingController>(CrowdFundingController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
