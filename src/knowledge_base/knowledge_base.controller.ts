import { Body, Controller, Get, Post } from "@nestjs/common";
import { KnowledgeBaseService } from "./knowledge_base.service";
import { CreateKnowledgeBaseDto } from "./dto/create-knowledge_base.dto";

@Controller("knowledge-base")
export class KnowledgeBaseController {
  constructor(private readonly knowledgeBaseService: KnowledgeBaseService) {}

  @Get("status")
  getStatus() {
    return this.knowledgeBaseService.getStatus();
  }

  @Post("chat")
  create(@Body() createKnowledgeBaseDto: CreateKnowledgeBaseDto) {
    return this.knowledgeBaseService.create(createKnowledgeBaseDto);
  }
}
