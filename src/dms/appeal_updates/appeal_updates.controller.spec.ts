import { Test, TestingModule } from '@nestjs/testing';
import { AppealUpdatesController } from './appeal_updates.controller';
import { AppealUpdatesService } from './appeal_updates.service';

describe('AppealUpdatesController', () => {
  let controller: AppealUpdatesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppealUpdatesController],
      providers: [AppealUpdatesService],
    }).compile();

    controller = module.get<AppealUpdatesController>(AppealUpdatesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
