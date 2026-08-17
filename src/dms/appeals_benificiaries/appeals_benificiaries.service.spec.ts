import { Test, TestingModule } from '@nestjs/testing';
import { AppealsBenificiariesService } from './appeals_benificiaries.service';

describe('AppealsBenificiariesService', () => {
  let service: AppealsBenificiariesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppealsBenificiariesService],
    }).compile();

    service = module.get<AppealsBenificiariesService>(AppealsBenificiariesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
