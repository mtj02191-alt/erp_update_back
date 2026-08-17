import { Test, TestingModule } from '@nestjs/testing';
import { ReceiptTemplatesService } from './receipt_templates.service';

describe('ReceiptTemplatesService', () => {
  let service: ReceiptTemplatesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ReceiptTemplatesService],
    }).compile();

    service = module.get<ReceiptTemplatesService>(ReceiptTemplatesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
