import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { KnowledgeBaseController } from "./knowledge_base.controller";
import { KnowledgeBaseService } from "./knowledge_base.service";

describe('KnowledgeBaseController', () => {
  let controller: KnowledgeBaseController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [KnowledgeBaseController],
      providers: [
        KnowledgeBaseService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<KnowledgeBaseController>(KnowledgeBaseController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
