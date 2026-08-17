import { Test, TestingModule } from '@nestjs/testing';
import { ReceiptTemplatesController } from './receipt_templates.controller';
import { ReceiptTemplatesService } from './receipt_templates.service';

describe('ReceiptTemplatesController', () => {
  let controller: ReceiptTemplatesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ReceiptTemplatesController],
      providers: [ReceiptTemplatesService],
    }).compile();

    controller = module.get<ReceiptTemplatesController>(ReceiptTemplatesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
