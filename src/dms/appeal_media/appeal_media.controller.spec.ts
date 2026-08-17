import { Test, TestingModule } from '@nestjs/testing';
import { AppealMediaController } from './appeal_media.controller';
import { AppealMediaService } from './appeal_media.service';

describe('AppealMediaController', () => {
  let controller: AppealMediaController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppealMediaController],
      providers: [AppealMediaService],
    }).compile();

    controller = module.get<AppealMediaController>(AppealMediaController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
