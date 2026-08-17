import { Test, TestingModule } from '@nestjs/testing';
import { AppealUpdatesService } from './appeal_updates.service';

describe('AppealUpdatesService', () => {
  let service: AppealUpdatesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppealUpdatesService],
    }).compile();

    service = module.get<AppealUpdatesService>(AppealUpdatesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
