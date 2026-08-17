import { Test, TestingModule } from '@nestjs/testing';
import { AppealMediaService } from './appeal_media.service';

describe('AppealMediaService', () => {
  let service: AppealMediaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AppealMediaService],
    }).compile();

    service = module.get<AppealMediaService>(AppealMediaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
