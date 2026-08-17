import { Test, TestingModule } from '@nestjs/testing';
import { AppealsBenificiariesController } from './appeals_benificiaries.controller';
import { AppealsBenificiariesService } from './appeals_benificiaries.service';

describe('AppealsBenificiariesController', () => {
  let controller: AppealsBenificiariesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AppealsBenificiariesController],
      providers: [AppealsBenificiariesService],
    }).compile();

    controller = module.get<AppealsBenificiariesController>(AppealsBenificiariesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
